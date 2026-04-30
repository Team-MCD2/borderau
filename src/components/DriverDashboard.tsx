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

export default function DriverDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<DeliveryNoteRow[]>([]);
  const [signatureModal, setSignatureModal] = useState<DeliveryNoteRow | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      // The backend API automatically filters by the logged-in livreur_id when role is 'livreur'
      // We only want to see 'en_livraison' or 'confirme' (or 'cree' if somehow assigned)
      const res = await fetch(`/api/delivery-notes?limit=100`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement tournées');
      
      // Local filter to only show actionable statuses for the driver
      const actionable = (data.delivery_notes ?? []).filter((n: DeliveryNoteRow) => 
        ['cree', 'confirme', 'en_livraison'].includes(n.statut)
      );
      
      setNotes(actionable);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [addToast, headers]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
      
      addToast('success', newStatus === 'signe' ? 'Livraison terminée et signée !' : 'Statut mis à jour');
      
      // Refresh list
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

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 mb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes Tournées</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gérez vos livraisons du jour.</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {notes.length} livraison{notes.length > 1 ? 's' : ''} en attente
        </span>
        <button
          onClick={fetchNotes}
          disabled={loading}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Rafraîchissement...' : 'Rafraîchir'}
        </button>
      </div>

      {loading && notes.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-4">🚚</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucune livraison</h3>
          <p className="text-gray-500 dark:text-gray-400">Vous n'avez aucune livraison en cours. Bonne journée !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const clientName = `${note.client_prenom || ''} ${note.client_nom || ''}`.trim();
            const adresse = note.client_adresse || 'Adresse non renseignée';
            const tel = note.client_telephone || '';
            const isUpdating = updating === note.id;

            return (
              <div key={note.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                      {note.numero_bl}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{clientName || 'Client Inconnu'}</h3>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{note.montant_total_ttc.toFixed(2)} €</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{note.items.length} article(s)</span>
                  </div>
                </div>
                
                <div className="p-4 flex-1">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="mt-0.5">📍</span>
                      <span className="flex-1">{adresse}</span>
                    </p>
                  </div>

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
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm border border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Articles :</p>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      {note.items.map(it => (
                        <li key={it.id} className="flex justify-between">
                          <span>{it.quantite}x {it.designation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                  {note.statut === 'cree' || note.statut === 'confirme' ? (
                    <button
                      onClick={() => updateStatus(note.id, 'en_livraison')}
                      disabled={isUpdating}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isUpdating ? '...' : '🚀 Démarrer la livraison'}
                    </button>
                  ) : note.statut === 'en_livraison' ? (
                    <button
                      onClick={() => setSignatureModal(note)}
                      disabled={isUpdating}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isUpdating ? '...' : '✍️ Faire signer (Livré)'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
