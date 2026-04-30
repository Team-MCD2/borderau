import { useCallback, useEffect, useState, useMemo } from 'react';
import { useToast } from './Toast';
import SignatureModal from './SignatureModal';

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
  client_nom?: string | null;
  client_prenom?: string | null;
  client_telephone?: string | null;
  client_adresse?: string | null;
  items: DeliveryNoteItem[];
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('decoshop_token');
}

function getUserInfo(): { nom: string; prenom: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('decoshop_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface DriverDashboardProps {
  onLogout?: () => void;
}

export default function DriverDashboard({ onLogout }: DriverDashboardProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allNotes, setAllNotes] = useState<DeliveryNoteRow[]>([]);
  const [signatureModal, setSignatureModal] = useState<DeliveryNoteRow | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const user = useMemo(() => getUserInfo(), []);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/delivery-notes?limit=100`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement tournées');
      setAllNotes(data.delivery_notes ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [addToast, headers]);

  useEffect(() => {
    fetchNotes();
    // Auto-refresh every 30 seconds to catch newly assigned deliveries
    const interval = setInterval(fetchNotes, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  // Split notes into active deliveries and history
  const activeNotes = useMemo(
    () => allNotes.filter((n) => ['cree', 'confirme', 'en_livraison'].includes(n.statut)),
    [allNotes],
  );

  const historyNotes = useMemo(
    () => allNotes.filter((n) => ['livre', 'signe'].includes(n.statut)),
    [allNotes],
  );

  const displayedNotes = tab === 'active' ? activeNotes : historyNotes;

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ statut: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de mise à jour');

      addToast('success', newStatus === 'signe' ? '✅ Livraison terminée et signée !' : 'Statut mis à jour');
      await fetchNotes();
      if (signatureModal) setSignatureModal(null);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur réseau');
    } finally {
      setUpdating(null);
    }
  };

  const handleSign = () => {
    if (signatureModal) {
      updateStatus(signatureModal.id, 'signe');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('decoshop_token');
    localStorage.removeItem('decoshop_user');
    if (onLogout) onLogout();
    window.location.reload();
  };

  const statusBadge = (statut: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      cree: { label: 'Créé', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
      confirme: { label: 'Confirmé', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      en_livraison: { label: 'En livraison', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      livre: { label: 'Livré', cls: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      signe: { label: 'Signé ✓', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    };
    const s = map[statut] || { label: statut, cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.prenom?.[0]?.toUpperCase() || '🚚'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {user ? `${user.prenom} ${user.nom}` : 'Livreur'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">DecoShop — Livreur</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ─── Tabs Active / Historique ─── */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'active'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            🚀 À livrer ({activeNotes.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'history'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            ✅ Historique ({historyNotes.length})
          </button>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {displayedNotes.length} livraison{displayedNotes.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchNotes}
            disabled={loading}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700"
          >
            {loading ? '⏳' : '🔄'} Rafraîchir
          </button>
        </div>

        {loading && allNotes.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedNotes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-5xl mb-4">{tab === 'active' ? '🎉' : '📋'}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {tab === 'active' ? 'Aucune livraison en attente' : 'Pas encore d\'historique'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {tab === 'active' ? 'Toutes vos livraisons sont terminées. Bonne journée !' : 'Vos livraisons complétées apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedNotes.map((note) => {
              const clientName = `${note.client_prenom || ''} ${note.client_nom || ''}`.trim();
              const adresse = note.client_adresse || 'Adresse non renseignée';
              const tel = note.client_telephone || '';
              const isUpdating = updating === note.id;
              const isHistory = tab === 'history';

              return (
                <div
                  key={note.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden flex flex-col ${
                    isHistory
                      ? 'border-gray-100 dark:border-gray-700 opacity-80'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {note.numero_bl}
                        </span>
                        {statusBadge(note.statut)}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {clientName || 'Client Inconnu'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white">
                        {note.montant_total_ttc.toFixed(2)} €
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {note.items.length} article{note.items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1">
                    {/* Address */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="mt-0.5">📍</span>
                        <span className="flex-1">{adresse}</span>
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    {!isHistory && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-xl font-medium transition-colors text-sm"
                        >
                          🗺️ Ouvrir GPS
                        </a>
                        {tel && (
                          <a
                            href={`tel:${tel}`}
                            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-xl font-medium transition-colors text-sm"
                          >
                            📞 Appeler
                          </a>
                        )}
                      </div>
                    )}

                    {/* Items list */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm border border-gray-100 dark:border-gray-700">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Articles :</p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        {note.items.map((it) => (
                          <li key={it.id} className="flex justify-between">
                            <span>
                              {it.quantite}x {it.designation}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              {(it.quantite * it.prix_unitaire).toFixed(2)} €
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Footer — Action buttons */}
                  {!isHistory && (
                    <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                      {note.statut === 'cree' || note.statut === 'confirme' ? (
                        <button
                          onClick={() => updateStatus(note.id, 'en_livraison')}
                          disabled={isUpdating}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '🚀 Démarrer la livraison'
                          )}
                        </button>
                      ) : note.statut === 'en_livraison' ? (
                        <button
                          onClick={() => setSignatureModal(note)}
                          disabled={isUpdating}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '✍️ Faire signer & valider'
                          )}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {signatureModal && (
        <SignatureModal
          clientName={`${signatureModal.client_prenom || ''} ${signatureModal.client_nom || ''}`.trim()}
          onClose={() => setSignatureModal(null)}
          onSign={handleSign}
        />
      )}
    </div>
  );
}
