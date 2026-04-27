# Shopify Delivery Dashboard

Tableau de bord de gestion des bons de livraison Shopify, construit avec **Astro**, **React**, **Tailwind CSS** et **TypeScript**.

---

## Installation

```bash
# 1. Cloner le projet
cd Desktop/dasbord

# 2. Installer les dependances
npm install

# 3. (Optionnel) Configurer Shopify
cp .env.example .env
# Remplir SHOPIFY_STORE_URL et SHOPIFY_ACCESS_TOKEN

# 4. Lancer le serveur de dev
npm run dev
```

Le dashboard est accessible sur **http://localhost:4321**

> Sans fichier `.env`, le dashboard fonctionne en **mode demo** avec des donnees fictives.

---

## Guide d'utilisation

### Vue d'ensemble

```
+------------------------------------------------------+
|  Header : Bons de Livraison          [Connecte]      |
+------------------------------------------------------+
|  [Stats] Total | Expediees | Partielles | Non exp.   |
|  [Analytics] Graphiques (depliable)                   |
|  [Toolbar] Filtres | Recherche | Auto-refresh | CSV  |
|  [Tableau] Liste des commandes avec tri/pagination    |
|  [API Log] Journal des appels (depliable)             |
+------------------------------------------------------+
```

---

### 1. Barre de statistiques

En haut du dashboard, 5 cartes affichent en temps reel :

| Carte | Description |
|-------|-------------|
| **Total commandes** | Nombre total de commandes chargees |
| **Expediees** | Commandes entierement expediees |
| **Partielles** | Commandes partiellement expediees |
| **Non expediees** | Commandes sans expedition |
| **Avec tracking** | Commandes ayant un numero de suivi |

---

### 2. Analytiques

Cliquer sur le bouton **"Analytiques"** pour deplier le panneau :

- **Graphique barres** : commandes par jour sur les 7 derniers jours
- **Graphique donut** : repartition des statuts (vert/jaune/rouge)
- **KPIs** : chiffre d'affaires total, taux d'expedition, commandes a expedier

Cliquer sur la fleche pour replier.

---

### 3. Filtres et recherche

#### Filtres rapides
4 boutons en haut du tableau :
- **Toutes** : affiche tout
- **Non exp.** : commandes non expediees uniquement
- **Partielles** : commandes partiellement expediees
- **Expediees** : commandes entierement expediees

#### Recherche
Le champ de recherche filtre par :
- Numero de commande (`#1001`)
- Nom du client
- Email
- Numero de tracking

> Raccourci : appuyer sur `/` pour focus direct dans la recherche.

---

### 4. Tableau des commandes

#### Colonnes
| Colonne | Description |
|---------|-------------|
| Checkbox | Selection pour actions groupees |
| Commande | Numero de la commande (triable) |
| Client | Nom + email |
| Date | Date de creation (triable) |
| Montant | Prix total (triable) |
| Statut | Badge colore (triable) |
| Tracking | Numero de suivi cliquable |
| Actions | Boutons d'action rapide |

#### Tri
Cliquer sur l'en-tete d'une colonne pour trier :
- 1er clic : tri croissant (fleche vers le haut)
- 2e clic : tri decroissant (fleche vers le bas)
- Colonne active = icone bleue

#### Pagination
En bas du tableau :
- Selecteur **10 / 25 / 50** resultats par page
- Navigation : premiere, precedente, numeros, suivante, derniere
- Indicateur : "8 commandes . Page 1/1"

---

### 5. Actions sur une commande

#### Cliquer sur une ligne
Ouvre le **panneau de details** a droite avec :
- Informations client et adresse
- Liste des articles commandes
- Fulfillments existants avec tracking
- Boutons : creer un bon, editer tracking, imprimer

#### Bouton "+ Bon"
Ouvre la modale de **creation de bon de livraison** :
1. Selectionner les articles a expedier (checkbox)
2. Remplir le numero de tracking (optionnel)
3. Choisir le transporteur
4. Cocher "Notifier le client" si souhaite
5. Cliquer sur **Creer le bon**

#### Bouton imprimante
Ouvre l'**apercu du bon de livraison** :
- Preview formatee avec en-tete, client, adresse, articles, tracking
- Bouton **"Imprimer / PDF"** : ouvre la fenetre d'impression du navigateur
- Pour sauver en PDF : choisir "Enregistrer en PDF" comme imprimante

#### Cliquer sur un tracking
Ouvre la modale d'**edition du tracking** :
- Modifier le numero de suivi
- Changer le transporteur
- Mettre a jour l'URL de suivi
- Bouton **Annuler le fulfillment** (en rouge)

---

### 6. Actions groupees (Bulk)

#### Selectionner
- **Checkbox par ligne** : selectionner une commande
- **Checkbox en-tete** : selectionner/deselectionner toute la page
- **Ctrl+A** : raccourci pour tout selectionner

#### Barre d'actions
Apparait en bleu quand au moins 1 commande est selectionnee :

| Bouton | Action |
|--------|--------|
| **Creer bons en masse** | Cree automatiquement un fulfillment pour chaque commande non expediee selectionnee |
| **Exporter PDF** | Genere un bon de livraison par commande et ouvre l'impression (1 page par bon) |
| **X** | Deselectionner tout |

> Les lignes selectionnees sont surbrillees en bleu clair.

---

### 7. Export CSV

Bouton telechargement dans la toolbar (icone document + fleche).

Exporte un fichier CSV avec les colonnes :
```
Commande, Client, Email, Date, Montant, Devise, Statut, Tracking
```

- Respecte les filtres et le tri actifs
- Fichier nomme `commandes-2026-04-24.csv`
- Encodage UTF-8 compatible Excel

---

### 8. Auto-refresh

Selecteur dans la toolbar :

| Option | Comportement |
|--------|-------------|
| **Auto: Off** | Pas de rafraichissement automatique |
| **30s** | Recharge les commandes toutes les 30 secondes |
| **1 min** | Recharge toutes les minutes |
| **5 min** | Recharge toutes les 5 minutes |

Utile pour surveiller les nouvelles commandes en temps reel.

---

### 9. Dark Mode

Bouton lune/soleil dans la toolbar :
- **Lune** : passer en mode sombre
- **Soleil** : revenir en mode clair
- Le choix est **sauvegarde** (persiste apres fermeture du navigateur)
- Detecte automatiquement la preference systeme au premier lancement

---

### 10. Raccourcis clavier

| Touche | Action |
|--------|--------|
| `/` | Focus sur le champ de recherche |
| `R` | Rafraichir les donnees |
| `Esc` | Fermer le panel/modale ouverte |
| `Ctrl+A` | Selectionner toutes les commandes de la page |

> Les raccourcis sont desactives quand vous tapez dans un champ de texte.
> Un aide-memoire est affiche sous la toolbar.

---

### 11. Mode demo vs Production

#### Mode demo (par defaut)
- Bandeau jaune : "Mode demo - Donnees fictives"
- 8 commandes fictives avec differents statuts
- Toutes les actions fonctionnent (creation, edition, impression)
- Ideal pour tester l'interface

#### Mode production
Creer un fichier `.env` :
```env
SHOPIFY_STORE_URL=votre-boutique.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxx
```

Pour obtenir le token :
1. Aller dans **Shopify Admin > Settings > Apps and sales channels**
2. Cliquer sur **Develop apps**
3. Creer une app avec les scopes :
   - `read_orders`
   - `write_fulfillments`
   - `read_fulfillments`
4. Copier le **Admin API access token**

---

### 12. Journal API

En bas de page, cliquer sur **"Journal API (X appels)"** pour voir :

| Colonne | Description |
|---------|-------------|
| Heure | Timestamp de l'appel |
| Methode | GET / POST (badge colore) |
| URL | Endpoint appele |
| Status | Code HTTP (vert=OK, rouge=erreur) |
| Duree | Temps de reponse en ms |

---

## Structure du projet

```
src/
  components/
    App.tsx              -- Wrapper (ThemeProvider + ToastProvider)
    Dashboard.tsx        -- Composant principal (tableau, filtres, modales)
    StatsBar.tsx         -- Cartes de statistiques
    Analytics.tsx        -- Graphiques (barres + donut + KPIs)
    OrderDetailPanel.tsx -- Panel lateral de details
    CreateFulfillmentModal.tsx -- Modale creation bon
    EditTrackingModal.tsx     -- Modale edition tracking
    DeliveryNotePrint.tsx     -- Apercu impression PDF
    Toast.tsx            -- Systeme de notifications
    ThemeProvider.tsx     -- Contexte dark/light mode
    ApiLog.tsx           -- Journal des appels API
    DeliveryTable.tsx    -- (ancien composant, remplace par Dashboard)
  layouts/
    Layout.astro         -- Layout HTML principal
  pages/
    index.astro          -- Page d'accueil
    api/
      orders.ts          -- API proxy commandes
      fulfillments.ts    -- API proxy fulfillments
      fulfillment/[id]/
        tracking.ts      -- API mise a jour tracking
        cancel.ts        -- API annulation fulfillment
  lib/
    shopify.ts           -- Client API Shopify + types
    api-helpers.ts       -- Utilitaires API
    mock-data.ts         -- Donnees fictives
```

---

## Scripts

```bash
npm run dev      # Serveur de developpement (port 4321)
npm run build    # Build de production
npm run preview  # Preview du build
```
#   b o r d e r a u  
 