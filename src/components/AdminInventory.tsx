import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from './Toast';

interface Category {
  id: number;
  nom: string;
  couleur_affichage?: string;
  icone?: string | null;
}

interface Article {
  id: number;
  numero_article: string;
  description: string;
  marque?: string | null;
  modele?: string | null;
  categorie_id?: number | null;
  categorie_nom?: string | null;
  prix_achat?: number | null;
  prix_vente?: number | null;
  quantite?: number | null;
  created_at?: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('decoshop_token');
}

export default function AdminInventory() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  const [search, setSearch] = useState('');
  const [categorieId, setCategorieId] = useState<string>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const token = getToken();
    return { Authorization: token ? `Bearer ${token}` : '' };
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement catégories');
      setCategories(data.categories ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur chargement catégories');
    }
  }, [addToast, headers]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (categorieId) params.set('categorie_id', categorieId);
      params.set('limit', '100');
      const res = await fetch(`/api/articles?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement articles');
      setArticles(data.articles ?? []);
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur chargement articles');
    } finally {
      setLoading(false);
    }
  }, [addToast, categorieId, headers, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const upsertArticle = useCallback(async (article: Partial<Article>) => {
    setSaving(true);
    try {
      const isEdit = Boolean(article.id);
      const url = isEdit ? `/api/articles/${article.id}` : '/api/articles';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, any> = { ...article };
      delete payload.id;
      delete payload.numero_article;
      delete payload.categorie_nom;
      delete payload.created_at;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde article');

      addToast('success', isEdit ? 'Article mis à jour' : 'Article créé');
      setCreateOpen(false);
      setEditArticle(null);
      await fetchArticles();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur sauvegarde article');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchArticles, headers]);

  const deleteArticle = useCallback(async (id: number) => {
    if (!confirm('Supprimer cet article ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
      addToast('success', 'Article supprimé');
      await fetchArticles();
    } catch (e: any) {
      addToast('error', e?.message || 'Erreur suppression');
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchArticles, headers]);

  const handleExportCSV = () => {
    const headersCSV = ['Numéro', 'Description', 'Marque', 'Modèle', 'Catégorie', 'Stock', 'Prix achat', 'Prix vente'];
    const rows = articles.map(a => [
      a.numero_article,
      a.description,
      a.marque || '',
      a.modele || '',
      a.categorie_nom || '',
      a.quantite ?? 0,
      Number(a.prix_achat ?? 0).toFixed(2),
      Number(a.prix_vente ?? 0).toFixed(2),
    ]);

    const csvContent = [
      headersCSV.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `articles_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administration — Inventaire</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gérer les articles et catégories</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (description, marque, modèle, numéro)"
            className="w-full sm:flex-1 sm:min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <select
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.nom}</option>
            ))}
          </select>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Article
          </button>
          <button
            onClick={fetchArticles}
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
              <th className="py-2 pr-4">Numéro</th>
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Catégorie</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Prix vente</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">Chargement…</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">Aucun article</td></tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 dark:border-gray-700/60">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{a.numero_article}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{a.description}</td>
                  <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{a.categorie_nom ?? ''}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">{a.quantite ?? 0}</td>
                  <td className="py-2 pr-4 hidden sm:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">{Number(a.prix_vente ?? 0).toFixed(2)} €</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditArticle(a)}
                        className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => deleteArticle(a.id)}
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

      {(createOpen || editArticle) && (
        <ArticleModal
          saving={saving}
          categories={categories}
          initial={editArticle ?? undefined}
          onClose={() => {
            setCreateOpen(false);
            setEditArticle(null);
          }}
          onSave={upsertArticle}
        />
      )}
    </div>
  );
}

function ArticleModal({
  initial,
  categories,
  onClose,
  onSave,
  saving,
}: {
  initial?: Article;
  categories: Category[];
  onClose: () => void;
  onSave: (article: Partial<Article>) => void;
  saving: boolean;
}) {
  const isEdit = Boolean(initial);

  const [description, setDescription] = useState(initial?.description ?? '');
  const [marque, setMarque] = useState(initial?.marque ?? '');
  const [modele, setModele] = useState(initial?.modele ?? '');
  const [categorieId, setCategorieId] = useState<string>(initial?.categorie_id ? String(initial.categorie_id) : '');
  const [prixAchat, setPrixAchat] = useState(String(initial?.prix_achat ?? 0));
  const [prixVente, setPrixVente] = useState(String(initial?.prix_vente ?? 0));
  const [quantite, setQuantite] = useState(String(initial?.quantite ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{isEdit ? 'Modifier article' : 'Créer article'}</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Fermer
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Marque</label>
            <input
              value={marque}
              onChange={(e) => setMarque(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Modèle</label>
            <input
              value={modele}
              onChange={(e) => setModele(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Catégorie</label>
            <select
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Quantité</label>
            <input
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              type="number"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Prix achat</label>
            <input
              value={prixAchat}
              onChange={(e) => setPrixAchat(e.target.value)}
              type="number"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Prix vente</label>
            <input
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
              type="number"
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
            disabled={saving || !description.trim()}
            onClick={() =>
              onSave({
                id: initial?.id,
                description: description.trim(),
                marque: marque || null,
                modele: modele || null,
                categorie_id: categorieId ? Number(categorieId) : null,
                prix_achat: Number(prixAchat || 0),
                prix_vente: Number(prixVente || 0),
                quantite: Number(quantite || 0),
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
