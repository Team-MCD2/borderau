import { useState } from 'react';
import type { ShopifyFulfillment, ApiLogEntry } from '../lib/shopify';

interface EditTrackingModalProps {
  fulfillment: ShopifyFulfillment;
  onClose: () => void;
  onUpdated: () => void;
  onLog: (log: ApiLogEntry) => void;
}

export default function EditTrackingModal({
  fulfillment,
  onClose,
  onUpdated,
  onLog,
}: EditTrackingModalProps) {
  const [trackingNumber, setTrackingNumber] = useState(fulfillment.tracking_number ?? '');
  const [trackingUrl, setTrackingUrl] = useState(fulfillment.tracking_url ?? '');
  const [trackingCompany, setTrackingCompany] = useState(fulfillment.tracking_company ?? '');
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber && !trackingUrl && !trackingCompany) {
      setError('Remplissez au moins un champ de tracking');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fulfillment/${fulfillment.id}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber || undefined,
          tracking_url: trackingUrl || undefined,
          tracking_company: trackingCompany || undefined,
          notify_customer: notifyCustomer,
        }),
      });

      const data = await res.json();
      if (data.log) onLog(data.log);

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la mise à jour');
        return;
      }

      onUpdated();
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Annuler le bon de livraison #${fulfillment.id} ?`)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fulfillment/${fulfillment.id}/cancel`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.log) onLog(data.log);

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'annulation");
        return;
      }

      onUpdated();
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Modifier le tracking</h2>
            <p className="text-sm text-gray-500">
              Fulfillment #{fulfillment.id} · Statut:{' '}
              <span
                className={`font-medium ${
                  fulfillment.status === 'success'
                    ? 'text-green-600'
                    : fulfillment.status === 'cancelled'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                }`}
              >
                {fulfillment.status}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° de suivi</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ex: 1Z999AA10123456784"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transporteur</label>
            <select
              value={trackingCompany}
              onChange={(e) => setTrackingCompany(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">— Sélectionner —</option>
              <option value="Colissimo">Colissimo</option>
              <option value="Chronopost">Chronopost</option>
              <option value="DHL">DHL</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="Mondial Relay">Mondial Relay</option>
              <option value="DPD">DPD</option>
              <option value="GLS">GLS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de suivi</label>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Notifier le client par email</span>
          </label>

          {/* Articles inclus */}
          {fulfillment.line_items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Articles inclus</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {fulfillment.line_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="truncate flex-1">{item.title}</span>
                    <span className="ml-2 shrink-0">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || fulfillment.status === 'cancelled'}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Annuler le bon
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Mise à jour…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
