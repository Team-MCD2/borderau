// ============================================================
// src/lib/mock-data.ts — Données fictives pour test sans Shopify
// ============================================================
import type { ShopifyOrder, ShopifyFulfillment, ShopifyLineItem } from './shopify';

const NOW = Date.now();
const DAY = 86_400_000;

function date(daysAgo: number): string {
  return new Date(NOW - daysAgo * DAY).toISOString();
}

// --------------- Line Items ---------------

const PRODUCTS: Omit<ShopifyLineItem, 'id' | 'fulfillment_status'>[] = [
  { title: 'T-shirt Oversize Noir', quantity: 2, sku: 'TSH-BLK-L', price: '29.90' },
  { title: 'Jean Slim Bleu', quantity: 1, sku: 'JN-BLU-M', price: '59.90' },
  { title: 'Sneakers Urban White', quantity: 1, sku: 'SNK-WHT-42', price: '89.00' },
  { title: 'Hoodie Gris Chiné', quantity: 1, sku: 'HOD-GRY-XL', price: '49.90' },
  { title: 'Casquette Logo', quantity: 3, sku: 'CAP-LOG-OS', price: '19.90' },
  { title: 'Sac à dos Canvas', quantity: 1, sku: 'BAG-CNV-01', price: '39.90' },
  { title: 'Chaussettes Pack x3', quantity: 1, sku: 'SCK-PK3-M', price: '14.90' },
  { title: 'Veste Bomber Kaki', quantity: 1, sku: 'JKT-KHK-L', price: '99.00' },
  { title: 'Polo Classic Marine', quantity: 2, sku: 'POL-NVY-M', price: '34.90' },
  { title: 'Short Cargo Beige', quantity: 1, sku: 'SHR-BGE-L', price: '44.90' },
];

function lineItem(
  id: number,
  productIdx: number,
  status: string | null = null,
): ShopifyLineItem {
  const p = PRODUCTS[productIdx % PRODUCTS.length];
  return { id, ...p, fulfillment_status: status };
}

// --------------- Fulfillments ---------------

function fulfillment(
  id: number,
  orderId: number,
  opts: {
    status?: string;
    tracking_number?: string | null;
    tracking_company?: string | null;
    tracking_url?: string | null;
    daysAgo?: number;
    items: ShopifyLineItem[];
  },
): ShopifyFulfillment {
  return {
    id,
    order_id: orderId,
    status: opts.status ?? 'success',
    tracking_number: opts.tracking_number ?? null,
    tracking_url: opts.tracking_url ?? null,
    tracking_company: opts.tracking_company ?? null,
    created_at: date(opts.daysAgo ?? 1),
    updated_at: date(opts.daysAgo ? opts.daysAgo - 0.5 : 0.5),
    line_items: opts.items,
  };
}

// --------------- Orders ---------------

export const MOCK_ORDERS: ShopifyOrder[] = [
  // 1 — Commande entièrement expédiée avec tracking
  {
    id: 5001,
    name: '#1001',
    email: 'marie.dupont@gmail.com',
    created_at: date(5),
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '119.70',
    currency: 'EUR',
    line_items: [
      lineItem(10001, 0, 'fulfilled'),
      lineItem(10002, 1, 'fulfilled'),
    ],
    fulfillments: [
      fulfillment(20001, 5001, {
        tracking_number: '6A12345678901',
        tracking_company: 'Colissimo',
        tracking_url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901',
        daysAgo: 3,
        items: [
          lineItem(10001, 0, 'fulfilled'),
          lineItem(10002, 1, 'fulfilled'),
        ],
      }),
    ],
    shipping_address: {
      first_name: 'Marie',
      last_name: 'Dupont',
      address1: '12 Rue de la Paix',
      city: 'Paris',
      province: 'Île-de-France',
      country: 'France',
      zip: '75002',
    },
    customer: { id: 1001, first_name: 'Marie', last_name: 'Dupont', email: 'marie.dupont@gmail.com' },
  },

  // 2 — Commande en cours de préparation
  {
    id: 5002,
    name: '#1002',
    email: 'jean.martin@outlook.fr',
    created_at: date(4),
    financial_status: 'paid',
    fulfillment_status: 'in_progress',
    total_price: '138.90',
    currency: 'EUR',
    line_items: [
      lineItem(10003, 2, 'fulfilled'),
      lineItem(10004, 3, null),
    ],
    fulfillments: [
      fulfillment(20002, 5002, {
        tracking_number: 'XY987654321FR',
        tracking_company: 'Chronopost',
        tracking_url: 'https://www.chronopost.fr/tracking?id=XY987654321FR',
        daysAgo: 2,
        items: [lineItem(10003, 2, 'fulfilled')],
      }),
    ],
    shipping_address: {
      first_name: 'Jean',
      last_name: 'Martin',
      address1: '45 Avenue Victor Hugo',
      city: 'Lyon',
      province: 'Auvergne-Rhône-Alpes',
      country: 'France',
      zip: '69002',
    },
    customer: { id: 1002, first_name: 'Jean', last_name: 'Martin', email: 'jean.martin@outlook.fr' },
  },

  // 3 — Non expédiée
  {
    id: 5003,
    name: '#1003',
    email: 'sophie.bernard@yahoo.fr',
    created_at: date(3),
    financial_status: 'paid',
    fulfillment_status: null,
    total_price: '59.70',
    currency: 'EUR',
    line_items: [
      lineItem(10005, 4, null),
      lineItem(10006, 6, null),
    ],
    fulfillments: [],
    shipping_address: {
      first_name: 'Sophie',
      last_name: 'Bernard',
      address1: '8 Rue Foch',
      city: 'Marseille',
      province: "Provence-Alpes-Côte d'Azur",
      country: 'France',
      zip: '13001',
    },
    customer: { id: 1003, first_name: 'Sophie', last_name: 'Bernard', email: 'sophie.bernard@yahoo.fr' },
  },

  // 4 — Non expédiée (grosse commande)
  {
    id: 5004,
    name: '#1004',
    email: 'pierre.leroy@free.fr',
    created_at: date(2),
    financial_status: 'paid',
    fulfillment_status: null,
    total_price: '198.80',
    currency: 'EUR',
    line_items: [
      lineItem(10007, 7, null),
      lineItem(10008, 8, null),
      lineItem(10009, 5, null),
    ],
    fulfillments: [],
    shipping_address: {
      first_name: 'Pierre',
      last_name: 'Leroy',
      address1: '22 Boulevard Gambetta',
      city: 'Toulouse',
      province: 'Occitanie',
      country: 'France',
      zip: '31000',
    },
    customer: { id: 1004, first_name: 'Pierre', last_name: 'Leroy', email: 'pierre.leroy@free.fr' },
  },

  // 5 — Expédiée via DHL
  {
    id: 5005,
    name: '#1005',
    email: 'emma.petit@gmail.com',
    created_at: date(7),
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '89.00',
    currency: 'EUR',
    line_items: [
      lineItem(10010, 2, 'fulfilled'),
    ],
    fulfillments: [
      fulfillment(20003, 5005, {
        tracking_number: 'JJD000390007812345',
        tracking_company: 'DHL',
        tracking_url: 'https://www.dhl.com/fr/tracking?id=JJD000390007812345',
        daysAgo: 5,
        items: [lineItem(10010, 2, 'fulfilled')],
      }),
    ],
    shipping_address: {
      first_name: 'Emma',
      last_name: 'Petit',
      address1: '3 Rue des Lilas',
      city: 'Bordeaux',
      province: 'Nouvelle-Aquitaine',
      country: 'France',
      zip: '33000',
    },
    customer: { id: 1005, first_name: 'Emma', last_name: 'Petit', email: 'emma.petit@gmail.com' },
  },

  // 6 — Non expédiée récente
  {
    id: 5006,
    name: '#1006',
    email: 'lucas.moreau@hotmail.com',
    created_at: date(1),
    financial_status: 'paid',
    fulfillment_status: null,
    total_price: '69.80',
    currency: 'EUR',
    line_items: [
      lineItem(10011, 8, null),
    ],
    fulfillments: [],
    shipping_address: {
      first_name: 'Lucas',
      last_name: 'Moreau',
      address1: '17 Rue du Commerce',
      city: 'Nantes',
      province: 'Pays de la Loire',
      country: 'France',
      zip: '44000',
    },
    customer: { id: 1006, first_name: 'Lucas', last_name: 'Moreau', email: 'lucas.moreau@hotmail.com' },
  },

  // 7 — Expédiée sans tracking (fulfillment sans numéro)
  {
    id: 5007,
    name: '#1007',
    email: 'chloe.roux@gmail.com',
    created_at: date(6),
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '44.90',
    currency: 'EUR',
    line_items: [
      lineItem(10012, 9, 'fulfilled'),
    ],
    fulfillments: [
      fulfillment(20004, 5007, {
        status: 'success',
        daysAgo: 4,
        items: [lineItem(10012, 9, 'fulfilled')],
      }),
    ],
    shipping_address: {
      first_name: 'Chloé',
      last_name: 'Roux',
      address1: '5 Place Bellecour',
      city: 'Lyon',
      province: 'Auvergne-Rhône-Alpes',
      country: 'France',
      zip: '69002',
    },
    customer: { id: 1007, first_name: 'Chloé', last_name: 'Roux', email: 'chloe.roux@gmail.com' },
  },

  // 8 — En cours (Mondial Relay)
  {
    id: 5008,
    name: '#1008',
    email: 'hugo.garcia@laposte.net',
    created_at: date(3),
    financial_status: 'paid',
    fulfillment_status: 'in_progress',
    total_price: '154.70',
    currency: 'EUR',
    line_items: [
      lineItem(10013, 0, 'fulfilled'),
      lineItem(10014, 7, null),
      lineItem(10015, 4, null),
    ],
    fulfillments: [
      fulfillment(20005, 5008, {
        tracking_number: 'MR123456789',
        tracking_company: 'Mondial Relay',
        tracking_url: 'https://www.mondialrelay.fr/suivi?code=MR123456789',
        daysAgo: 1,
        items: [lineItem(10013, 0, 'fulfilled')],
      }),
    ],
    shipping_address: {
      first_name: 'Hugo',
      last_name: 'Garcia',
      address1: '28 Rue de la République',
      city: 'Strasbourg',
      province: 'Grand Est',
      country: 'France',
      zip: '67000',
    },
    customer: { id: 1008, first_name: 'Hugo', last_name: 'Garcia', email: 'hugo.garcia@laposte.net' },
  },
];
