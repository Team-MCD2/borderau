// ============================================================
// GET     /api/fulfillments?order_id=X — liste les fulfillments
// POST    /api/fulfillments            — crée un fulfillment
// OPTIONS /api/fulfillments            — preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { getFulfillments, createFulfillment, isConfigured } from '../../lib/shopify';
import type { CreateFulfillmentPayload } from '../../lib/shopify';
import { MOCK_ORDERS } from '../../lib/mock-data';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../lib/api-helpers';

function mockLog(method: string, path: string) {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method, url: `${path} (mock)`, status: 200, duration: 0, ok: true };
}

// --------------- CORS preflight ---------------
export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- GET /api/fulfillments?order_id=X ---------------
export const GET: APIRoute = async ({ url }) => {
  const orderId = Number(url.searchParams.get('order_id'));

  if (!orderId || isNaN(orderId)) {
    return jsonError('Paramètre order_id requis et doit être un nombre', 400);
  }

  // Mode mock
  if (!isConfigured()) {
    const order = MOCK_ORDERS.find((o) => o.id === orderId);
    return jsonOk({
      fulfillments: order?.fulfillments ?? [],
      mock: true,
      log: mockLog('GET', `/api/fulfillments?order_id=${orderId}`),
    });
  }

  const { data, error, status, log } = await getFulfillments(orderId);

  if (error) {
    return jsonError(error, status || 502, log);
  }

  return jsonOk({ fulfillments: data?.fulfillments ?? [], log });
};

// --------------- POST /api/fulfillments ---------------
export const POST: APIRoute = async ({ request }) => {
  const parsed = await safeJsonParse<CreateFulfillmentPayload>(request);
  if (parsed.error) return parsed.error;

  const { order_id, line_item_ids, tracking_number, tracking_url, tracking_company, notify_customer } = parsed.data;

  if (!order_id || typeof order_id !== 'number') {
    return jsonError('order_id requis (number)', 400);
  }
  if (!Array.isArray(line_item_ids) || line_item_ids.length === 0) {
    return jsonError('line_item_ids[] requis (array non vide)', 400);
  }

  // Mode mock — simule la création
  if (!isConfigured()) {
    const order = MOCK_ORDERS.find((o) => o.id === order_id);
    const mockItems = order?.line_items.filter((li) => line_item_ids.includes(li.id)) ?? [];

    const mockFulfillment = {
      id: Math.floor(Math.random() * 100000),
      order_id,
      status: 'success',
      tracking_number: tracking_number ?? null,
      tracking_url: tracking_url ?? null,
      tracking_company: tracking_company ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: mockItems.map((li) => ({ ...li, fulfillment_status: 'fulfilled' })),
    };

    return jsonOk({
      fulfillment: mockFulfillment,
      mock: true,
      log: mockLog('POST', '/api/fulfillments'),
    }, 201);
  }

  const { data, error, status, log } = await createFulfillment({
    order_id,
    tracking_number,
    tracking_url,
    tracking_company,
    line_item_ids,
    notify_customer,
  });

  if (error) {
    return jsonError(error, status || 502, log);
  }

  return jsonOk({ fulfillment: data?.fulfillment, log }, 201);
};
