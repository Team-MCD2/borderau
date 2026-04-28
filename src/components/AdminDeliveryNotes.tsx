import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from './Toast';

type Role = 'admin' | 'vendeur' | 'vendeur_proprietaire' | 'livreur';

interface UserRow {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: Role;
  created_at: string;
}

interface DeliveryNoteItem {
  id: number;
  bl_id: number;
  article_id: number | null;
  designation: string;
  quantite: number;
  prix_unitaire: number;
}

interface DeliveryNoteRow {
  id: number;
  numero_bl: string;
  statut: string;
  mode_livraison: string;
  montant_total_ttc: number;
  date_creation: string;
  date_livraison?: string;
  livreur_id?: number | null;
  livreur_name?: string | null;
  vendeur_name?: string | null;
  client_nom?: string | null;
  client_prenom?: string | null;
  client_email?: string | null;
  items: DeliveryNoteItem[];
}

type DeliveryNoteStatus = 'cree' | 'confirme' | 'en_livraison' | 'livre' | 'signe';

const STATUSES: DeliveryNoteStatus[] = ['cree', 'confirme', 'en_livraison', 'livre', 'signe'];

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('decoshop_token');
}

export default function AdminDeliveryNotes() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<DeliveryNoteRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | DeliveryNoteStatus>('all');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const livreurs = useMemo(() => users.filter((u) => u.role === 'livreur'), [users]);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur chargement utilisateurs');
      }
      setUsers(data.users ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur chargement utilisateurs');
    }
  }, [addToast, headers]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('statut', status);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '100');
      const res = await fetch(`/api/delivery-notes?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur chargement BL');
      }
      setNotes(data.delivery_notes ?? []);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement BL');
    } finally {
      setLoading(false);
    }
  }, [headers, search, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const updateNote = useCallback(async (id: number, patch: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur mise à jour BL');
      }
      const updated = data.delivery_note as DeliveryNoteRow;
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      addToast('success', 'Bon de livraison mis à jour');
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur mise à jour BL');
    } finally {
      setSaving(false);
    }
  }, [addToast, headers]);

  const onChangeStatus = (note: DeliveryNoteRow, next: DeliveryNoteStatus) => {
    updateNote(note.id, { statut: next });
  };

  const onChangeLivreur = (note: DeliveryNoteRow, livreurId: string) => {
    const value = livreurId ? Number(livreurId) : null;
    updateNote(note.id, { livreur_id: value });
  };

  const handlePrint = (note: DeliveryNoteRow) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = note.items?.map((item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.designation}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantite}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${Number(item.prix_unitaire).toFixed(2)} €</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.quantite * item.prix_unitaire).toFixed(2)} €</td>
      </tr>
    `).join('') || '';

    const total = note.items?.reduce((sum, item) => sum + item.quantite * item.prix_unitaire, 0) || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BL ${note.numero_bl}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; text-align: right; }
          .signature { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Bon de Livraison</h1>
            <p><strong>N° :</strong> ${note.numero_bl}</p>
            <p><strong>Date :</strong> ${new Date(note.date_creation).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <p><strong>Client :</strong> ${(note.client_prenom ? note.client_prenom + ' ' : '') + (note.client_nom || '')}</p>
          <p><strong>Email :</strong> ${note.client_email || ''}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="total">Total TTC :</td>
              <td class="total">${total.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
        <div class="signature">
          <p>Signature destinataire</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleExportCSV = () => {
    const headersCSV = ['Numéro BL', 'Client', 'Email', 'Montant TTC', 'Statut', 'Livreur', 'Date création'];
    const rows = notes.map(n => [
      n.numero_bl,
      `${n.client_prenom || ''} ${n.client_nom || ''}`,
      n.client_email || '',
      Number(n.montant_total_ttc ?? 0).toFixed(2),
      n.statut,
      n.livreur_name || '',
      new Date(n.date_creation).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headersCSV.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bl_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkStatusChange = (newStatus: DeliveryNoteStatus) => {
    if (selectedIds.size === 0) {
      addToast('error', 'Sélectionnez au moins un BL');
      return;
    }
    setSaving(true);
    Promise.all(Array.from(selectedIds).map(id => updateNote(id, { statut: newStatus })))
      .then(() => {
        addToast('success', `${selectedIds.size} BL(s) mis à jour`);
        setSelectedIds(new Set());
      })
      .catch(() => addToast('error', 'Erreur mise à jour'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administration — Bons de livraison</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Changer statut et assigner un livreur</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (numéro, client, email)"
            className="w-full sm:flex-1 sm:min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Tous</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={fetchNotes}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            Rafraîchir
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 flex items-center gap-3">
          <span className="text-sm text-blue-700 dark:text-blue-300">{selectedIds.size} BL(s) sélectionné(s)</span>
          <select
            onChange={(e) => handleBulkStatusChange(e.target.value as DeliveryNoteStatus)}
            disabled={saving}
            className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">Changer statut...</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-blue-600 dark:text-blue-400 underline"
          >
            Annuler
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4 w-10">
                <input
                  type="checkbox"
                  checked={notes.length > 0 && selectedIds.size === notes.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(notes.map(n => n.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="py-2 pr-4">BL</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Client</th>
              <th className="py-2 pr-4 hidden md:table-cell">Montant</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Livreur</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Items</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-6 text-center text-gray-500 dark:text-gray-400">Chargement…</td></tr>
            ) : notes.length === 0 ? (
              <tr><td colSpan={8} className="py-6 text-center text-gray-500 dark:text-gray-400">Aucun BL</td></tr>
            ) : (
              notes.map((n) => (
                <tr key={n.id} className="border-b border-gray-100 dark:border-gray-700/60">
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds);
                        if (e.target.checked) {
                          newSet.add(n.id);
                        } else {
                          newSet.delete(n.id);
                        }
                        setSelectedIds(newSet);
                      }}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{n.numero_bl}</td>
                  <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300">
                    {(n.client_prenom ? `${n.client_prenom} ` : '') + (n.client_nom ?? '')}
                    <div className="text-xs text-gray-500 dark:text-gray-400">{n.client_email ?? ''}</div>
                  </td>
                  <td className="py-2 pr-4 hidden md:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{Number(n.montant_total_ttc ?? 0).toFixed(2)} €</td>
                  <td className="py-2 pr-4">
                    <select
                      value={(n.statut as any) || 'cree'}
                      onChange={(e) => onChangeStatus(n, e.target.value as DeliveryNoteStatus)}
                      disabled={saving}
                      className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={n.livreur_id ? String(n.livreur_id) : ''}
                      onChange={(e) => onChangeLivreur(n, e.target.value)}
                      disabled={saving}
                      className="min-w-52 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">—</option>
                      {livreurs.map((u) => (
                        <option key={u.id} value={String(u.id)}>{u.prenom} {u.nom}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{n.items?.length ?? 0}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <button
                      onClick={() => handlePrint(n)}
                      className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
