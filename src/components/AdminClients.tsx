import { useCallback, useEffect, useState, useMemo } from 'react';
import { useToast } from './Toast';

interface Client {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('decoshop_token');
}

export default function AdminClients() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);

  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '100');
      const res = await fetch(`/api/clients?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement clients');
      setClients(data.clients ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  }, [addToast, headers, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const upsertClient = useCallback(async (client: Partial<Client>) => {
    setSaving(true);
    try {
      const isEdit = Boolean(client.id);
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, any> = { ...client };
      delete payload.id;
      delete payload.created_at;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde client');

      addToast('success', isEdit ? 'Client mis à jour' : 'Client créé');
      setCreateOpen(false);
      setEditClient(null);
      await fetchClients();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur sauvegarde client');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchClients, headers]);

  const deleteClient = useCallback(async (id: number) => {
    if (!confirm('Supprimer ce client ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
      addToast('success', 'Client supprimé');
      await fetchClients();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur suppression');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchClients, headers]);

  const handleExportCSV = () => {
    const headersCSV = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Adresse', 'Date création'];
    const rows = clients.map(c => [
      c.nom,
      c.prenom,
      c.email,
      c.telephone,
      c.adresse,
      new Date(c.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headersCSV.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administration — Clients</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gérer les clients</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email, téléphone)"
            className="w-full sm:flex-1 sm:min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Client
          </button>
          <button
            onClick={fetchClients}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60"
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

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4">Nom</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Email</th>
              <th className="py-2 pr-4">Téléphone</th>
              <th className="py-2 pr-4 hidden md:table-cell">Adresse</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">Chargement…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">Aucun client</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/60">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {(c.prenom ? `${c.prenom} ` : '') + c.nom}
                  </td>
                  <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300">{c.email}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">{c.telephone}</td>
                  <td className="py-2 pr-4 hidden md:table-cell text-gray-700 dark:text-gray-300">{c.adresse}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditClient(c)}
                        className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => deleteClient(c.id)}
                        disabled={saving}
                        className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(createOpen || editClient) && (
        <ClientModal
          saving={saving}
          initial={editClient ?? undefined}
          onClose={() => {
            setCreateOpen(false);
            setEditClient(null);
          }}
          onSave={upsertClient}
        />
      )}
    </div>
  );
}

function ClientModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: Client;
  onClose: () => void;
  onSave: (client: Partial<Client>) => void;
  saving: boolean;
}) {
  const isEdit = Boolean(initial);

  const [nom, setNom] = useState(initial?.nom ?? '');
  const [prenom, setPrenom] = useState(initial?.prenom ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telephone, setTelephone] = useState(initial?.telephone ?? '');
  const [adresse, setAdresse] = useState(initial?.adresse ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Modifier client' : 'Créer client'}</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Fermer
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Nom</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Prénom</label>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Téléphone</label>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400">Adresse</label>
            <input
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Annuler
          </button>
          <button
            disabled={saving || !nom.trim()}
            onClick={() =>
              onSave({
                id: initial?.id,
                nom: nom.trim(),
                prenom: prenom.trim(),
                email: email.trim(),
                telephone: telephone.trim(),
                adresse: adresse.trim(),
              })
            }
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
