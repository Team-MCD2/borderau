// ============================================================
// PUT     /api/fulfillment/[id]/tracking — Met à jour le tracking
// OPTIONS /api/fulfillment/[id]/tracking — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { updateTracking, isConfigured } from '../../../../lib/shopify';
import type { UpdateTrackingPayload } from '../../../../lib/shopify';
import { MOCK_ORDERS } from '../../../../lib/mock-data';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../../../lib/api-helpers';

// --------------- CORS preflight ---------------
export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- PUT /api/fulfillment/[id]/tracking ---------------
export const PUT: APIRoute = async ({ params, request }) => {
  const fulfillmentId = Number(params.id);

  if (!fulfillmentId || isNaN(fulfillmentId)) {
    return jsonError('Paramètre id invalide (doit être un nombre)', 400);
  }

  const parsed = await safeJsonParse<UpdateTrackingPayload>(request);
  if (parsed.error) return parsed.error;

  const { tracking_number, tracking_url, tracking_company, notify_customer } = parsed.data;

  if (!tracking_number && !tracking_url && !tracking_company) {
    return jsonError('Au moins un champ de tracking requis (tracking_number, tracking_url, tracking_company)', 400);
  }

  // Mode mock
  if (!isConfigured()) {
    const existing = MOCK_ORDERS
      .flatMap((o) => o.fulfillments)
      .find((f) => f.id === fulfillmentId);

    return jsonOk({
      fulfillment: {
        ...(existing ?? { id: fulfillmentId, order_id: 0, status: 'success', line_items: [], created_at: new Date().toISOString() }),
        tracking_number: tracking_number ?? existing?.tracking_number ?? null,
        tracking_url: tracking_url ?? existing?.tracking_url ?? null,
        tracking_company: tracking_company ?? existing?.tracking_company ?? null,
        updated_at: new Date().toISOString(),
      },
      mock: true,
      log: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: 'PUT', url: `/api/fulfillment/${fulfillmentId}/tracking (mock)`, status: 200, duration: 0, ok: true },
    });
  }

  const { data, error, status, log } = await updateTracking(fulfillmentId, {
    tracking_number,
    tracking_url,
    tracking_company,
    notify_customer,
  });

  if (error) {
    return jsonError(error, status || 502, log);
  }

  return jsonOk({ fulfillment: data?.fulfillment, log });
};
