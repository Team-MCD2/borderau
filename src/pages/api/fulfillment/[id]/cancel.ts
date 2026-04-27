// ============================================================
// POST    /api/fulfillment/[id]/cancel — Annule un fulfillment
// OPTIONS /api/fulfillment/[id]/cancel — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { cancelFulfillment, isConfigured } from '../../../../lib/shopify';
import { MOCK_ORDERS } from '../../../../lib/mock-data';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
} from '../../../../lib/api-helpers';

// --------------- CORS preflight ---------------
export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- POST /api/fulfillment/[id]/cancel ---------------
export const POST: APIRoute = async ({ params }) => {
  const fulfillmentId = Number(params.id);

  if (!fulfillmentId || isNaN(fulfillmentId)) {
    return jsonError('Paramètre id invalide (doit être un nombre)', 400);
  }

  // Mode mock
  if (!isConfigured()) {
    const existing = MOCK_ORDERS
      .flatMap((o) => o.fulfillments)
      .find((f) => f.id === fulfillmentId);

    return jsonOk({
      fulfillment: {
        ...(existing ?? { id: fulfillmentId, order_id: 0, line_items: [], tracking_number: null, tracking_url: null, tracking_company: null, created_at: new Date().toISOString() }),
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      },
      mock: true,
      log: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: 'POST', url: `/api/fulfillment/${fulfillmentId}/cancel (mock)`, status: 200, duration: 0, ok: true },
    });
  }

  const { data, error, status, log } = await cancelFulfillment(fulfillmentId);

  if (error) {
    return jsonError(error, status || 502, log);
  }

  return jsonOk({ fulfillment: data?.fulfillment, log });
};
