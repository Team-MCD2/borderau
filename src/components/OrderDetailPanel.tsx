import type { ShopifyOrder, ShopifyFulfillment } from '../lib/shopify';

interface OrderDetailPanelProps {
  order: ShopifyOrder;
  onClose: () => void;
  onCreateFulfillment: (order: ShopifyOrder) => void;
  onEditTracking: (fulfillment: ShopifyFulfillment) => void;
  onPrintDeliveryNote: (order: ShopifyOrder, fulfillment?: ShopifyFulfillment) => void;
}

export default function OrderDetailPanel({
  order,
  onClose,
  onCreateFulfillment,
  onEditTracking,
  onPrintDeliveryNote,
}: OrderDetailPanelProps) {
  const statusColor = (status: string | null) => {
    switch (status) {
      case 'fulfilled': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-orange-100 text-orange-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case 'fulfilled': return 'Expédiée';
      case 'in_progress': return 'En cours';
      default: return 'Non expédiée';
    }
  };

  const fulfillmentStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in-left">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Commande {order.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(order.fulfillment_status)}`}>
                {statusLabel(order.fulfillment_status)}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Client */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Client</h3>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '—'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.email}</p>
            </div>
          </section>

          {/* Adresse de livraison */}
          {order.shipping_address && (
            <section>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Adresse de livraison</h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-medium">{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                <p>{order.shipping_address.address1}</p>
                <p>{order.shipping_address.zip} {order.shipping_address.city}</p>
                <p>{order.shipping_address.province && `${order.shipping_address.province}, `}{order.shipping_address.country}</p>
              </div>
            </section>
          )}

          {/* Montant */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Paiement</h3>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Number(order.total_price).toLocaleString('fr-FR', { style: 'currency', currency: order.currency || 'EUR' })}
                </p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{order.financial_status}</p>
              </div>
            </div>
          </section>

          {/* Articles */}
          <section>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Articles ({order.line_items.length})
            </h3>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {order.line_items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku || '—'}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">×{item.quantity}</p>
                    <p className="text-xs text-gray-400">{item.price} €</p>
                  </div>
                  <div className="ml-3 shrink-0">
                    {item.fulfillment_status === 'fulfilled' ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Expédié</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">En attente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bons de livraison (fulfillments) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Bons de livraison ({order.fulfillments.length})
              </h3>
              {order.fulfillment_status !== 'fulfilled' && (
                <button
                  onClick={() => onCreateFulfillment(order)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Nouveau bon
                </button>
              )}
            </div>

            {order.fulfillments.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                <p className="text-sm text-gray-400">Aucun bon de livraison</p>
                {order.fulfillment_status !== 'fulfilled' && (
                  <button
                    onClick={() => onCreateFulfillment(order)}
                    className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Créer un bon
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {order.fulfillments.map((f) => (
                  <div key={f.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Fulfillment #{f.id}</p>
                        <p className={`text-xs font-medium ${fulfillmentStatusColor(f.status)}`}>
                          {f.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditTracking(f)}
                          className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => onPrintDeliveryNote(order, f)}
                          className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          Imprimer
                        </button>
                      </div>
                    </div>

                    {/* Tracking info */}
                    {f.tracking_number && (
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-700/50 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">N° suivi:</span>
                          <span className="font-mono text-blue-600">{f.tracking_number}</span>
                        </div>
                        {f.tracking_company && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-600 dark:text-gray-400">Transporteur:</span>
                            <span className="font-medium">{f.tracking_company}</span>
                          </div>
                        )}
                        {f.tracking_url && (
                          <a
                            href={f.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                          >
                            Suivre le colis
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Articles du fulfillment */}
                    <div className="text-xs text-gray-400">
                      {f.line_items.map((li) => li.title).join(', ')}
                    </div>

                    {/* Timeline */}
                    <div className="text-xs text-gray-400 flex gap-4">
                      <span>Créé: {new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                      <span>MAJ: {new Date(f.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Actions globales */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => onPrintDeliveryNote(order)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer le récapitulatif complet
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
