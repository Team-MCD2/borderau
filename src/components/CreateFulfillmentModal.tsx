import { useState } from 'react';
import type { ShopifyOrder, ApiLogEntry } from '../lib/shopify';

interface CreateFulfillmentModalProps {
  order: ShopifyOrder;
  onClose: () => void;
  onCreated: () => void;
  onLog: (log: ApiLogEntry) => void;
}

type DeliveryMode = 'domicile' | 'retrait';

export default function CreateFulfillmentModal({
  order,
  onClose,
  onCreated,
  onLog,
}: CreateFulfillmentModalProps) {
  const allItems = order.line_items;
  const alreadyFulfilled = allItems.every((li) => li.fulfillment_status === 'fulfilled');

  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('domicile');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/fulfillments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          line_item_ids: allItems.map((li) => li.id),
          tracking_number: trackingNumber || undefined,
          tracking_url: trackingUrl || undefined,
          tracking_company: trackingCompany || undefined,
          notify_customer: notifyCustomer,
        }),
      });

      const data = await res.json();
      if (data.log) onLog(data.log);

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création');
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Créer un bon de livraison</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Commande {order.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Articles récapitulatif (tous expédiés d'un coup) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Articles ({allItems.length})
            </label>
            {alreadyFulfilled ? (
              <p className="text-sm text-gray-400 italic">Tous les articles sont déjà expédiés</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50">
                {allItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{item.title}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 shrink-0">
                      x{item.quantity} · {item.price} €
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-blue-500 dark:text-blue-400">
              Tous les articles seront expédiés ensemble
            </p>
          </div>

          {/* Mode de livraison (RG-070) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mode de livraison
            </label>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  deliveryMode === 'domicile'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="domicile"
                  checked={deliveryMode === 'domicile'}
                  onChange={() => setDeliveryMode('domicile')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Livraison domicile</p>
                  <p className="text-xs text-gray-400">Livré à l'adresse du client</p>
                </div>
              </label>
              <label
                className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  deliveryMode === 'retrait'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="retrait"
                  checked={deliveryMode === 'retrait'}
                  onChange={() => setDeliveryMode('retrait')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Retrait magasin</p>
                  <p className="text-xs text-gray-400">Le client récupère en boutique</p>
                </div>
              </label>
            </div>
          </div>

          {/* Tracking (seulement si livraison domicile) */}
          {deliveryMode === 'domicile' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° de suivi</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ex: 1Z999AA10123456784"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transporteur</label>
                  <select
                    value={trackingCompany}
                    onChange={(e) => setTrackingCompany(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de suivi</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Notification */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Notifier le client par email</span>
          </label>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || alreadyFulfilled}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création…' : 'Créer le bon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
