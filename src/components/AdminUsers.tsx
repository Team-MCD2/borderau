import { useCallback, useEffect, useState, useMemo } from 'react';
import { useToast } from './Toast';

type Role = 'admin' | 'vendeur' | 'vendeur_proprietaire' | 'livreur';

interface UserRow {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: Role;
  active: number;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('decoshop_token');
}

export default function AdminUsers() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);

  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement utilisateurs');
      setUsers(data.users ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur chargement utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [addToast, headers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const upsertUser = useCallback(async (user: Partial<UserRow> & { password?: string }) => {
    setSaving(true);
    try {
      const isEdit = Boolean(user.id);
      const url = isEdit ? `/api/users/${user.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, any> = { ...user };
      delete payload.id;
      delete payload.created_at;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde utilisateur');

      addToast('success', isEdit ? 'Utilisateur mis à jour' : 'Utilisateur créé');
      setCreateOpen(false);
      setEditUser(null);
      await fetchUsers();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur sauvegarde utilisateur');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchUsers, headers]);

  const toggleActive = useCallback(async (user: UserRow) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ active: user.active ? 0 : 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur mise à jour statut');
      addToast('success', user.active ? 'Utilisateur désactivé' : 'Utilisateur activé');
      await fetchUsers();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur mise à jour statut');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchUsers, headers]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administration — Utilisateurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gérer les utilisateurs et leurs rôles</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email)"
            className="w-full sm:flex-1 sm:min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Utilisateur
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4">Nom</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Email</th>
              <th className="py-2 pr-4 hidden md:table-cell">Téléphone</th>
              <th className="py-2 pr-4">Rôle</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">Chargement…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">Aucun utilisateur</td></tr>
            ) : (
              users
                .filter((u) => {
                  const s = search.toLowerCase();
                  return (
                    u.nom.toLowerCase().includes(s) ||
                    u.prenom.toLowerCase().includes(s) ||
                    u.email.toLowerCase().includes(s)
                  );
                })
                .map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/60">
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {u.prenom} {u.nom}
                    </td>
                    <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300">{u.email}</td>
                    <td className="py-2 pr-4 hidden md:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{u.telephone}</td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap capitalize">{u.role}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        u.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {u.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditUser(u)}
                          className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={saving}
                          className="px-2 py-1 rounded-md bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-60"
                        >
                          {u.active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {(createOpen || editUser) && (
        <UserModal
          saving={saving}
          initial={editUser ?? undefined}
          onClose={() => {
            setCreateOpen(false);
            setEditUser(null);
          }}
          onSave={upsertUser}
        />
      )}
    </div>
  );
}

function UserModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: UserRow;
  onClose: () => void;
  onSave: (user: Partial<UserRow> & { password?: string }) => void;
  saving: boolean;
}) {
  const isEdit = Boolean(initial);

  const [nom, setNom] = useState(initial?.nom ?? '');
  const [prenom, setPrenom] = useState(initial?.prenom ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telephone, setTelephone] = useState(initial?.telephone ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'vendeur');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Modifier utilisateur' : 'Créer utilisateur'}</h3>
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

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="admin">Admin</option>
              <option value="vendeur_proprietaire">Vendeur propriétaire</option>
              <option value="vendeur">Vendeur</option>
              <option value="livreur">Livreur</option>
            </select>
          </div>

          {!isEdit && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400">Mot de passe</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Annuler
          </button>
          <button
            disabled={saving || !nom.trim() || !email.trim() || (!isEdit && !password)}
            onClick={() =>
              onSave({
                id: initial?.id,
                nom: nom.trim(),
                prenom: prenom.trim(),
                email: email.trim(),
                telephone: telephone.trim(),
                role,
                password: password || undefined,
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
