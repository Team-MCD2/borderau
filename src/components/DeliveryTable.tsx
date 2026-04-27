import { useState, useEffect, useCallback } from 'react';
import type { ShopifyOrder, ShopifyFulfillment, ApiLogEntry } from '../lib/shopify';
import StatsBar from './StatsBar';
import CreateFulfillmentModal from './CreateFulfillmentModal';
import EditTrackingModal from './EditTrackingModal';
import ApiLog from './ApiLog';

type FulfillmentFilter = 'all' | 'fulfilled' | 'partial' | 'unfulfilled';

export default function DeliveryTable() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FulfillmentFilter>('all');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);

  // Modals
  const [createModal, setCreateModal] = useState<ShopifyOrder | null>(null);
  const [editModal, setEditModal] = useState<ShopifyFulfillment | null>(null);

  const addLog = useCallback((log: ApiLogEntry) => {
    setLogs((prev) => [log, ...prev].slice(0, 50));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders?status=any&limit=50');
      const data = await res.json();

      if (data.log) addLog(data.log);

      if (!res.ok) {
        setError(data.error || 'Erreur lors du chargement');
        return;
      }

      setOrders(data.orders ?? []);
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filtrage
  const filteredOrders = orders.filter((order) => {
    // Filtre par statut
    if (filter === 'fulfilled' && order.fulfillment_status !== 'fulfilled') return false;
    if (filter === 'partial' && order.fulfillment_status !== 'partial') return false;
    if (filter === 'unfulfilled' && order.fulfillment_status && order.fulfillment_status !== 'unfulfilled') return false;

    // Recherche texte
    if (search) {
      const q = search.toLowerCase();
      const matchName = order.name.toLowerCase().includes(q);
      const matchEmail = order.email?.toLowerCase().includes(q);
      const matchCustomer =
        order.customer &&
        `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(q);
      const matchTracking = order.fulfillments.some(
        (f) => f.tracking_number?.toLowerCase().includes(q),
      );
      if (!matchName && !matchEmail && !matchCustomer && !matchTracking) return false;
    }

    return true;
  });

  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'fulfilled':
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Expédiée</span>;
      case 'partial':
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Partielle</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Non expédiée</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsBar orders={orders} loading={loading} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filtre */}
          {(['all', 'unfulfilled', 'partial', 'fulfilled'] as FulfillmentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'unfulfilled' ? 'Non exp.' : f === 'partial' ? 'Partielles' : 'Expédiées'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 sm:flex-initial">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full sm:w-64 rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            title="Rafraîchir"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="text-red-600 underline hover:text-red-800 text-sm font-medium">
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Commande</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Montant</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Tracking</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {orders.length === 0 ? 'Aucune commande trouvée' : 'Aucun résultat pour ce filtre'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50/50 transition-colors">
                    {/* Commande */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{order.name}</span>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">
                          {order.customer
                            ? `${order.customer.first_name} ${order.customer.last_name}`
                            : '—'}
                        </p>
                        <p className="text-xs text-gray-400">{order.email}</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Montant */}
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {Number(order.total_price).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: order.currency || 'EUR',
                      })}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">{statusBadge(order.fulfillment_status)}</td>

                    {/* Tracking */}
                    <td className="px-4 py-3">
                      {order.fulfillments.length > 0 ? (
                        <div className="space-y-1">
                          {order.fulfillments.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setEditModal(f)}
                              className="block text-left group"
                            >
                              {f.tracking_number ? (
                                <span className="font-mono text-xs text-blue-600 group-hover:underline">
                                  {f.tracking_number}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 group-hover:text-blue-500">
                                  Ajouter tracking
                                </span>
                              )}
                              {f.tracking_company && (
                                <span className="ml-1 text-xs text-gray-400">
                                  ({f.tracking_company})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {order.fulfillment_status !== 'fulfilled' && (
                          <button
                            onClick={() => setCreateModal(order)}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            + Bon
                          </button>
                        )}
                        {order.fulfillments.length > 0 && (
                          <button
                            onClick={() => setEditModal(order.fulfillments[0])}
                            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Éditer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filteredOrders.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-400">
            {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} affichée{filteredOrders.length > 1 ? 's' : ''}
            {filter !== 'all' && ` (filtre: ${filter})`}
          </div>
        )}
      </div>

      {/* Modals */}
      {createModal && (
        <CreateFulfillmentModal
          order={createModal}
          onClose={() => setCreateModal(null)}
          onCreated={fetchOrders}
          onLog={addLog}
        />
      )}

      {editModal && (
        <EditTrackingModal
          fulfillment={editModal}
          onClose={() => setEditModal(null)}
          onUpdated={fetchOrders}
          onLog={addLog}
        />
      )}

      {/* Journal API */}
      <ApiLog logs={logs} />
    </div>
  );
}
