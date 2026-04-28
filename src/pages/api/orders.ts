// ============================================================
// GET     /api/orders         — Proxy vers Shopify GET /orders.json
// OPTIONS /api/orders         — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { getOrders, isConfigured } from '../../lib/shopify';
import { MOCK_ORDERS } from '../../lib/mock-data';
import { dbAll, getCachedOrdersAsync, cacheOrdersAsync } from '../../lib/db';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
} from '../../lib/api-helpers';

// --------------- CORS preflight ---------------
export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- GET /api/orders ---------------
export const GET: APIRoute = async ({ url }) => {
  // Mode SQLite si Shopify non configuré — retourne les BL comme des commandes
  if (!isConfigured()) {
    const rows = await dbAll<Record<string, any>>(
      `SELECT bl.*,
              c.nom AS client_nom, c.prenom AS client_prenom,
              c.email AS client_email, c.adresse AS client_adresse,
              p_vendeur.prenom || ' ' || p_vendeur.nom AS vendeur_name
       FROM bons_livraison bl
       LEFT JOIN clients c ON c.id = bl.client_id
       LEFT JOIN profiles p_vendeur ON p_vendeur.id = bl.vendeur_id
       ORDER BY bl.date_creation DESC
       LIMIT 50`
    );

    // Formater les BL en format "order" pour le Dashboard
    const statusToFulfillment: Record<string, string | null> = {
      cree: null,
      confirme: null,
      en_livraison: 'in_progress',
      livre: 'fulfilled',
      signe: 'fulfilled',
    };

    const orders = [] as any[];
    for (const row of rows) {
      const items = await dbAll<Record<string, any>>('SELECT * FROM lignes_bl WHERE bl_id = ?', [row.id]);
      orders.push({
        id: row.id,
        name: row.numero_bl,
        email: row.client_email || '',
        created_at: row.date_creation,
        financial_status: 'paid',
        fulfillment_status: statusToFulfillment[row.statut] ?? null,
        total_price: String(row.montant_total_ttc ?? 0),
        currency: 'EUR',
        note: '',
        shipping_address: {
          first_name: row.client_prenom || '',
          last_name: row.client_nom || '',
          address1: row.client_adresse || '',
          city: '',
          province: '',
          country: 'France',
          zip: '',
        },
        customer: {
          id: row.client_id,
          first_name: row.client_prenom || '',
          last_name: row.client_nom || '',
          email: row.client_email || '',
        },
        line_items: items.map((it) => ({
          id: it.id,
          title: it.designation,
          quantity: it.quantite,
          sku: '',
          price: String(it.prix_unitaire ?? 0),
          fulfillment_status: statusToFulfillment[row.statut] ?? null,
        })),
        fulfillments: row.statut === 'livre' || row.statut === 'signe' || row.statut === 'en_livraison' ? [{
          id: row.id,
          order_id: row.id,
          status: row.statut === 'livre' || row.statut === 'signe' ? 'success' : 'pending',
          tracking_number: null,
          tracking_url: null,
          tracking_company: null,
          created_at: row.date_livraison || row.date_creation,
          line_items: items.map((it) => ({
            id: it.id,
            title: it.designation,
            quantity: it.quantite,
            sku: '',
            price: String(it.prix_unitaire ?? 0),
          })),
        }] : [],
        // Extra champs BL
        _bl_statut: row.statut,
        _bl_mode_livraison: row.mode_livraison,
        _bl_livreur_id: row.livreur_id,
      });
    }

    return jsonOk({
      orders,
      source: 'sqlite',
      log: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: 'GET', url: '/api/orders (SQLite)', status: 200, duration: 0, ok: true },
    });
  }

  // Mode production — proxy Shopify
  const allowedParams = ['status', 'limit', 'fulfillment_status', 'since_id', 'created_at_min', 'created_at_max'];
  const params: Record<string, string> = {};

  for (const key of allowedParams) {
    const value = url.searchParams.get(key);
    if (value) params[key] = value;
  }

  const { data, error, status, log } = await getOrders(params);

  if (error) {
    // Fallback to cached orders on Shopify failure
    try {
      const cached = await getCachedOrdersAsync();
      if (cached.length > 0) {
        return jsonOk({ orders: cached, cached: true, log });
      }
    } catch { /* ignore cache errors */ }
    return jsonError(error, status || 502, log);
  }

  // Cache orders in SQLite for offline access
  const orders = data?.orders ?? [];
  try {
    if (orders.length > 0) await cacheOrdersAsync(orders);
  } catch { /* ignore cache errors */ }

  return jsonOk({ orders, log });
};
