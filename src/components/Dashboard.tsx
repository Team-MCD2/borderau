import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ShopifyOrder, ShopifyFulfillment, ApiLogEntry } from '../lib/shopify';
import { useToast } from './Toast';
import { useTheme } from './ThemeProvider';
import StatsBar from './StatsBar';
import CreateFulfillmentModal from './CreateFulfillmentModal';
import EditTrackingModal from './EditTrackingModal';
import OrderDetailPanel from './OrderDetailPanel';
import DeliveryNotePrint from './DeliveryNotePrint';
import Analytics from './Analytics';
import ApiLog from './ApiLog';
import AdminDeliveryNotes from './AdminDeliveryNotes';
import AdminInventory from './AdminInventory';
import AdminClients from './AdminClients';
import AdminUsers from './AdminUsers';
import DriverDashboard from './DriverDashboard';

type AutoRefresh = 0 | 30 | 60 | 300;

type FulfillmentFilter = 'all' | 'fulfilled' | 'in_progress' | 'unfulfilled';

type SortKey = 'name' | 'date' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { addToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  const [userRole, setUserRole] = useState<string>('');

  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [filter, setFilter] = useState<FulfillmentFilter>('all');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState<AutoRefresh>(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Admin view
  const [adminView, setAdminView] = useState<'orders' | 'bl' | 'inventory' | 'clients' | 'users'>('orders');

  // Panels & modals
  const [detailOrder, setDetailOrder] = useState<ShopifyOrder | null>(null);
  const [createModal, setCreateModal] = useState<ShopifyOrder | null>(null);
  const [editModal, setEditModal] = useState<ShopifyFulfillment | null>(null);
  const [printData, setPrintData] = useState<{ order: ShopifyOrder; fulfillment?: ShopifyFulfillment } | null>(null);

  const addLog = useCallback((log: ApiLogEntry) => {
    setLogs((prev) => [log, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem('decoshop_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUserRole(u?.role || '');
      } catch {
        setUserRole('');
      }
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders?status=any&limit=50');
      const data = await res.json();

      if (data.log) addLog(data.log);
      if (data.mock) setIsMock(true);
      if (data.source === 'sqlite') setIsMock(false);

      if (!res.ok) {
        const msg = data.error || 'Erreur lors du chargement';
        setError(msg);
        addToast('error', msg);
        return;
      }

      setOrders(data.orders ?? []);
    } catch {
      const msg = 'Impossible de contacter le serveur';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [addLog, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh === 0) return;
    const id = setInterval(fetchOrders, autoRefresh * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchOrders]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Slash → focus search
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // Escape → close panels/modals or blur search
      if (e.key === 'Escape') {
        if (detailOrder) { setDetailOrder(null); return; }
        if (createModal) { setCreateModal(null); return; }
        if (editModal) { setEditModal(null); return; }
        if (printData) { setPrintData(null); return; }
        if (inInput) { (e.target as HTMLElement).blur(); return; }
      }
      if (inInput) return;
      // R → refresh
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchOrders();
        return;
      }
      // Ctrl+A → select all on page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        toggleSelectAll();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detailOrder, createModal, editModal, printData, fetchOrders]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Commande', 'Client', 'Email', 'Date', 'Montant', 'Devise', 'Statut', 'Tracking'],
    ];
    sortedOrders.forEach((o) => {
      rows.push([
        o.name,
        o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : '',
        o.email || '',
        new Date(o.created_at).toLocaleDateString('fr-FR'),
        o.total_price,
        o.currency || 'EUR',
        o.fulfillment_status || 'unfulfilled',
        o.fulfillments.map((f) => f.tracking_number || '').filter(Boolean).join(' / '),
      ]);
    });
    const delimiter = ';';
    const csvBody = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(delimiter))
      .join('\r\n');
    const csv = `sep=${delimiter}\r\n${csvBody}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', `${sortedOrders.length} commande(s) exportee(s) en CSV`);
  };

  // Export PDF
  const handleExportPDF = () => {
    if (sortedOrders.length === 0) {
      addToast('warning', 'Aucune commande à exporter');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const now = new Date();
    const titleDate = now.toLocaleDateString('fr-FR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Export commandes — ${titleDate}`, 14, 14);

    const head = [['Commande', 'Client', 'Email', 'Date', 'Montant', 'Devise', 'Statut', 'Tracking']];
    const body = sortedOrders.map((o) => ([
      o.name,
      o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : '',
      o.email || '',
      new Date(o.created_at).toLocaleDateString('fr-FR'),
      Number(o.total_price).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      o.currency || 'EUR',
      o.fulfillment_status || 'unfulfilled',
      o.fulfillments.map((f) => f.tracking_number || '').filter(Boolean).join(' / '),
    ]));

    autoTable(doc, {
      startY: 20,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 51, 153], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 55 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 15 },
        6: { cellWidth: 25 },
        7: { cellWidth: 55 },
      },
    });

    doc.save(`commandes-${now.toISOString().slice(0, 10)}.pdf`);
    addToast('success', `${sortedOrders.length} commande(s) exportee(s) en PDF`);
  };

  // Filtrage
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === 'fulfilled' && order.fulfillment_status !== 'fulfilled') return false;
      if (filter === 'in_progress' && order.fulfillment_status !== 'in_progress') return false;
      if (filter === 'unfulfilled' && order.fulfillment_status && order.fulfillment_status !== 'unfulfilled') return false;

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
  }, [orders, filter, search]);

  // Tri
  const sortedOrders = useMemo(() => {
    const statusOrder: Record<string, number> = { fulfilled: 2, in_progress: 1 };
    const sorted = [...filteredOrders].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'fr', { numeric: true });
          break;
        case 'date':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'amount':
          cmp = Number(a.total_price) - Number(b.total_price);
          break;
        case 'status':
          cmp = (statusOrder[a.fulfillment_status ?? ''] ?? 0) - (statusOrder[b.fulfillment_status ?? ''] ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredOrders, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / perPage));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedOrders.slice(start, start + perPage);
  }, [sortedOrders, page, perPage]);

  // Reset page quand filtre/recherche/perPage change
  useEffect(() => { setPage(1); }, [filter, search, perPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return (
        <svg className="ml-1 inline h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDir === 'asc' ? (
      <svg className="ml-1 inline h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 inline h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'fulfilled':
        return <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">Expédiée</span>;
      case 'in_progress':
        return <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">En cours</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">Non expédiée</span>;
    }
  };

  const handleCreated = () => {
    addToast('success', 'Bon de livraison créé avec succès');
    fetchOrders();
  };

  const handleUpdated = () => {
    addToast('success', 'Tracking mis à jour avec succès');
    fetchOrders();
  };

  // --------------- Bulk selection helpers ---------------

  const selectedOrders = useMemo(
    () => sortedOrders.filter((o) => selectedIds.has(o.id)),
    [sortedOrders, selectedIds],
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedOrders.map((o) => o.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allPageSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id));
  const somePageSelected =
    paginatedOrders.some((o) => selectedIds.has(o.id)) && !allPageSelected;

  // --------------- Bulk actions ---------------

  const handleBulkCreateFulfillments = async () => {
    const unfulfilled = selectedOrders.filter(
      (o) => o.fulfillment_status !== 'fulfilled',
    );
    if (unfulfilled.length === 0) {
      addToast('warning', 'Aucune commande non-expédiée sélectionnée');
      return;
    }

    setBulkLoading(true);
    let success = 0;
    let failed = 0;

    for (const order of unfulfilled) {
      const itemIds = order.line_items
        .filter((li) => li.fulfillment_status !== 'fulfilled')
        .map((li) => li.id);
      if (itemIds.length === 0) continue;

      try {
        const res = await fetch('/api/fulfillments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, line_item_ids: itemIds, notify_customer: false }),
        });
        const data = await res.json();
        if (data.log) addLog(data.log);
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkLoading(false);
    clearSelection();

    if (success > 0) addToast('success', `${success} bon(s) créé(s) avec succès`);
    if (failed > 0) addToast('error', `${failed} bon(s) en échec`);
    fetchOrders();
  };

  const handleBulkPrint = () => {
    if (selectedOrders.length === 0) {
      addToast('warning', 'Aucune commande sélectionnée');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { addToast('error', 'Popup bloquée par le navigateur'); return; }

    const pages = selectedOrders.map((order) => {
      const items = order.fulfillments.length > 0
        ? order.fulfillments[0].line_items
        : order.line_items;
      const f = order.fulfillments[0];
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      return `
        <div style="page-break-after: always; padding: 40px 0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:15px;border-bottom:2px solid #e5e7eb">
            <div>
              <div style="font-size:22px;font-weight:700">BON DE LIVRAISON</div>
              <div style="color:#6b7280;font-size:13px;margin-top:4px">Commande ${order.name} &middot; ${now}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:6px">Client</div>
              <p style="font-weight:500">${order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '—'}</p>
              <p style="color:#6b7280;font-size:13px">${order.email}</p>
            </div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:6px">Adresse</div>
              ${order.shipping_address ? `
                <p style="font-weight:500">${order.shipping_address.first_name} ${order.shipping_address.last_name}</p>
                <p style="font-size:13px">${order.shipping_address.address1}</p>
                <p style="font-size:13px">${order.shipping_address.zip} ${order.shipping_address.city}</p>
                <p style="font-size:13px">${order.shipping_address.country}</p>
              ` : '<p style="color:#9ca3af">Non renseignée</p>'}
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <thead><tr>
              <th style="text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:8px 10px;border-bottom:2px solid #e5e7eb">Article</th>
              <th style="text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:8px 10px;border-bottom:2px solid #e5e7eb">SKU</th>
              <th style="text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;padding:8px 10px;border-bottom:2px solid #e5e7eb">Qté</th>
              <th style="text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;padding:8px 10px;border-bottom:2px solid #e5e7eb">Prix</th>
            </tr></thead>
            <tbody>${items.map((li) => `
              <tr><td style="padding:10px;border-bottom:1px solid #f3f4f6;font-weight:500">${li.title}</td>
              <td style="padding:10px;border-bottom:1px solid #f3f4f6;font-family:monospace;font-size:13px;color:#6b7280">${li.sku || '—'}</td>
              <td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right">${li.quantity}</td>
              <td style="padding:10px;border-bottom:1px solid #f3f4f6;text-align:right">${li.price} €</td></tr>
            `).join('')}</tbody>
            <tfoot><tr><td colspan="3" style="padding:10px;text-align:right;font-weight:700">Total</td>
            <td style="padding:10px;text-align:right;font-weight:700">${Number(order.total_price).toFixed(2)} €</td></tr></tfoot>
          </table>
          ${f?.tracking_number ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:20px">
            <p><strong>Suivi:</strong> <span style="font-family:monospace">${f.tracking_number}</span></p>
            ${f.tracking_company ? `<p><strong>Transporteur:</strong> ${f.tracking_company}</p>` : ''}
          </div>` : ''}
          <div style="margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
            <div><div style="height:70px"></div><div style="border-top:1px solid #d1d5db;padding-top:6px;text-align:center;color:#6b7280;font-size:12px">Signature expéditeur</div></div>
            <div><div style="height:70px"></div><div style="border-top:1px solid #d1d5db;padding-top:6px;text-align:center;color:#6b7280;font-size:12px">Signature destinataire</div></div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bons de livraison</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px;color:#1a1a2e;font-size:14px}@media print{body{padding:0}}</style>
    </head><body>${pages}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);

    addToast('info', `${selectedOrders.length} bon(s) envoyé(s) à l'impression`);
  };

  // Si l'utilisateur est un livreur, afficher l'interface simplifiée
  if (userRole === 'livreur') {
    return <DriverDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Mock badge */}
      {isMock && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-4 py-3 flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">!</span>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Mode démo</strong> — Données fictives. Configurez <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">.env</code> pour connecter Shopify.
          </p>
        </div>
      )}

      {/* Stats */}
      <StatsBar orders={orders} loading={loading} />

      {/* Analytics */}
      <Analytics orders={orders} />

      {/* Admin tabs */}
      {(userRole === 'admin' || userRole === 'vendeur_proprietaire') && (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            onClick={() => setAdminView('orders')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminView === 'orders'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Commandes
          </button>
          <button
            onClick={() => setAdminView('bl')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminView === 'bl'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Admin BL
          </button>
          <button
            onClick={() => setAdminView('inventory')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminView === 'inventory'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Inventaire
          </button>
          <button
            onClick={() => setAdminView('clients')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminView === 'clients'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setAdminView('users')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminView === 'users'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Utilisateurs
          </button>
        </div>
      )}

      {/* View content */}
      {adminView === 'bl' ? (
        <AdminDeliveryNotes />
      ) : adminView === 'inventory' ? (
        <AdminInventory />
      ) : adminView === 'clients' ? (
        <AdminClients />
      ) : adminView === 'users' ? (
        <AdminUsers />
      ) : (
        <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'unfulfilled', 'in_progress', 'fulfilled'] as FulfillmentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'unfulfilled' ? 'Non expédiées' : f === 'in_progress' ? 'En cours' : 'Expédiées'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
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
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…  ( / )"
              className="w-full sm:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Auto-refresh */}
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value) as AutoRefresh)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-blue-500"
            title="Auto-refresh"
          >
            <option value={0}>Auto: Off</option>
            <option value={30}>30s</option>
            <option value={60}>1 min</option>
            <option value={300}>5 min</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Exporter CSV"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Exporter PDF"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
            </svg>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            title="Rafraîchir (R)"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-lg border border-red-200 dark:border-red-800 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Déconnexion"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Raccourcis clavier hint */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-500">
        <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300">/</kbd> Rechercher</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300">R</kbd> Rafraîchir</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300">Esc</kbd> Fermer</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300">Ctrl+A</kbd> Tout sélectionner</span>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="text-red-600 dark:text-red-400 underline hover:text-red-800 text-sm font-medium">
            Réessayer
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-30 rounded-xl bg-blue-600 text-white px-5 py-3 flex items-center justify-between shadow-lg animate-slide-in">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium">
              commande{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkCreateFulfillments}
              disabled={bulkLoading}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {bulkLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              Créer bons en masse
            </button>
            <button
              onClick={handleBulkPrint}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Exporter PDF
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
              title="Désélectionner tout"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-left">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleSort('name')}>Commande<SortIcon column="name" /></th>
                <th className="hidden sm:table-cell px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Client</th>
                <th className="hidden md:table-cell px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleSort('date')}>Date<SortIcon column="date" /></th>
                <th className="hidden sm:table-cell px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleSort('amount')}>Montant<SortIcon column="amount" /></th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleSort('status')}>Statut<SortIcon column="status" /></th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Tracking</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    {orders.length === 0 ? 'Aucune commande trouvée' : 'Aucun résultat pour ce filtre'}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedIds.has(order.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => setDetailOrder(order)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{order.name}</span>
                    </td>

                    <td className="hidden sm:table-cell px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {order.customer
                            ? `${order.customer.first_name} ${order.customer.last_name}`
                            : '—'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{order.email}</p>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="hidden sm:table-cell px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {Number(order.total_price).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: order.currency || 'EUR',
                      })}
                    </td>

                    <td className="px-4 py-3">{statusBadge(order.fulfillment_status)}</td>

                    <td className="hidden lg:table-cell px-4 py-3">
                      {order.fulfillments.length > 0 ? (
                        <div className="space-y-1">
                          {order.fulfillments.map((f) => (
                            <button
                              key={f.id}
                              onClick={(e) => { e.stopPropagation(); setEditModal(f); }}
                              className="block text-left group"
                            >
                              {f.tracking_number ? (
                                <span className="font-mono text-xs text-blue-600 group-hover:underline">
                                  {f.tracking_number}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500">
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
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {order.fulfillment_status !== 'fulfilled' && (
                          <button
                            onClick={() => setCreateModal(order)}
                            className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            + Bon
                          </button>
                        )}
                        <button
                          onClick={() => setPrintData({ order })}
                          className="rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          title="Imprimer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && sortedOrders.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Info */}
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {sortedOrders.length} commande{sortedOrders.length > 1 ? 's' : ''}
              {filter !== 'all' && ` (filtre: ${filter})`}
              {' · '} Page {page}/{totalPages}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-3">
              {/* Per page selector */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Afficher</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>par page</span>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Première page"
                >
                  ««
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-gray-300">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          page === item
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Dernière page"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order detail panel */}
      {detailOrder && (
        <OrderDetailPanel
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onCreateFulfillment={(o) => { setDetailOrder(null); setCreateModal(o); }}
          onEditTracking={(f) => { setDetailOrder(null); setEditModal(f); }}
          onPrintDeliveryNote={(o, f) => setPrintData({ order: o, fulfillment: f })}
        />
      )}

      {/* Create fulfillment modal */}
      {createModal && (
        <CreateFulfillmentModal
          order={createModal}
          onClose={() => setCreateModal(null)}
          onCreated={handleCreated}
          onLog={addLog}
        />
      )}

      {/* Edit tracking modal */}
      {editModal && (
        <EditTrackingModal
          fulfillment={editModal}
          onClose={() => setEditModal(null)}
          onUpdated={handleUpdated}
          onLog={addLog}
        />
      )}

      {/* Print preview */}
      {printData && (
        <DeliveryNotePrint
          order={printData.order}
          fulfillment={printData.fulfillment}
          onClose={() => setPrintData(null)}
        />
      )}

      {/* API log */}
      <ApiLog logs={logs} />
        </>
      )}
    </div>
  );
}
