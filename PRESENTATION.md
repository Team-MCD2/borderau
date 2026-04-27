# DECOSHOP TOULOUSE — Presentation du Projet

## Module Bons de Livraison — Projet de groupe

> Ce dashboard est un **module** du projet global DecoShop Toulouse.
> Il gere la **creation et le suivi des bons de livraison** (BL).
> Les regles de gestion suivies sont documentees dans `SPOILER_regles_de_gestion.md`.

---

# PARTIE 1 : EXPLICATION DE CHAQUE FONCTIONNALITE

---

## 1. Page de connexion (LoginPage)

**Ce que c'est :**
Un ecran de login qui protege l'acces au dashboard. L'utilisateur doit entrer un email et un mot de passe pour acceder a l'interface.

**Comment ca marche :**
- L'utilisateur entre `admin@decoshop.com` / `admin`
- Le systeme verifie les identifiants
- Si corrects → la session est sauvegardee dans le navigateur (localStorage)
- L'utilisateur est redirige vers le dashboard
- La session persiste meme si on ferme le navigateur

**Pourquoi c'est utile :**
Empeche les personnes non autorisees d'acceder aux donnees de commandes.

---

## 2. Statistiques en temps reel (StatsBar)

**Ce que c'est :**
5 cartes en haut du dashboard qui affichent un resume instantane.

**Les cartes :**
| Carte | Signification |
|-------|---------------|
| Total commandes | Combien de commandes au total |
| Expediees | Commandes dont tous les articles ont ete envoyes |
| Non expediees | Commandes ou rien n'a ete envoye |
| Avec tracking | Commandes qui ont un numero de suivi colis |

> **Note** : Il n'y a pas de statut "partielle" — chez DecoShop, quand on expedie une commande, on expedie **tous** les articles d'un coup.

**Pourquoi c'est utile :**
Vue d'ensemble immediate pour savoir ou en sont les expeditions.

---

## 3. Analytiques (Analytics)

**Ce que c'est :**
Un panneau depliable avec des graphiques visuels.

**Les graphiques :**
- **Barres** : nombre de commandes par jour sur les 7 derniers jours (permet de voir les tendances)
- **Donut** : repartition en camembert des statuts (vert = expediees, rouge = non expediees)
- **KPIs** : 4 indicateurs cles
  - Nombre total de commandes
  - Chiffre d'affaires total (en euros)
  - Taux d'expedition (% des commandes expediees)
  - Commandes a expedier (nombre en rouge)

**Pourquoi c'est utile :**
Permet de presenter des metriques visuelles dans une soutenance ou un rapport.

---

## 4. Filtres rapides

**Ce que c'est :**
4 boutons au-dessus du tableau pour filtrer les commandes.

| Bouton | Affiche |
|--------|---------|
| Toutes | Toutes les commandes sans filtre |
| Non expédiées | Seulement les commandes non expédiées |
| Expédiées | Seulement les commandes entièrement expédiées |

**Pourquoi c'est utile :**
En un clic, on isole les commandes qui nécessitent une action.

---

## 5. Recherche

**Ce que c'est :**
Un champ de texte qui filtre en temps réel les commandes.

**Recherche par :**
- Numéro de commande (ex: #1001)
- Nom du client
- Adresse email
- Numéro de tracking

**Raccourci :** Appuyer sur `/` au clavier pour aller directement dans la recherche.

---

## 6. Tri des colonnes

**Ce que c'est :**
Cliquer sur un en-tête de colonne pour trier les données.

**Colonnes triables :**
- Commande (ordre alphabétique/numérique)
- Date (plus récente ou plus ancienne d'abord)
- Montant (du moins cher au plus cher, ou inversement)
- Statut (non expédiées d'abord, ou expédiées d'abord)

**Comment ça marche :**
- 1er clic = tri croissant (flèche vers le haut)
- 2e clic = tri décroissant (flèche vers le bas)

---

## 7. Pagination

**Ce que c'est :**
Le tableau affiche les résultats par pages pour ne pas surcharger l'écran.

**Options :**
- 10, 25 ou 50 résultats par page
- Navigation : première page, précédente, numéros, suivante, dernière page
- Indicateur : "8 commandes - Page 1/1"

---

## 8. Sélection multiple (Checkboxes)

**Ce que c'est :**
Des cases à cocher sur chaque ligne pour sélectionner plusieurs commandes.

- Checkbox en haut = sélectionner/désélectionner TOUTE la page
- Checkbox par ligne = sélectionner une commande spécifique
- Les lignes sélectionnées sont surlignées en bleu
- Raccourci : `Ctrl+A` pour tout sélectionner

---

## 9. Actions groupées (Bulk Actions)

**Ce que c'est :**
Une barre bleue qui apparaît quand des commandes sont sélectionnées.

| Bouton | Action |
|--------|--------|
| Créer bons en masse | Crée automatiquement un bon de livraison pour chaque commande non expédiée sélectionnée |
| Exporter PDF | Génère un bon de livraison imprimable pour chaque commande sélectionnée (1 page par bon) |
| X | Désélectionner tout |

**Pourquoi c'est utile :**
Au lieu de traiter les commandes une par une, on peut en traiter 10 ou 50 d'un coup.

---

## 10. Panel de détails (OrderDetailPanel)

**Ce que c'est :**
Un panneau latéral qui s'ouvre quand on clique sur une ligne du tableau.

**Contenu :**
- Informations du client (nom, email)
- Adresse de livraison complète
- Liste des articles commandés (nom, SKU, quantité, prix)
- Fulfillments existants avec leur tracking
- Boutons d'action : créer un bon, éditer le tracking, imprimer

---

## 11. Création de bon de livraison (CreateFulfillmentModal)

**Ce que c'est :**
Une fenêtre modale pour créer un "fulfillment" (= dire à Shopify que des articles ont été expédiés).

**Étapes :**
1. Vérifier les articles (affichés en lecture seule — tous expédiés d'un coup)
2. Choisir le **mode de livraison** : domicile ou retrait magasin (RG-070)
3. Si domicile : entrer le numéro de tracking + transporteur
4. Cocher "Notifier le client" si souhaite
5. Cliquer sur **Créer le bon**

**Ce qui se passe :**
L'appli envoie une requête POST à l'API Shopify pour enregistrer l'expédition.
Le BL est généré au format **DECO-BL-YYMMDD-XXXX** (RG-070).

> Tous les articles sont expédiés ensemble — pas d'expédition partielle chez DecoShop.

---

## 12. Édition du tracking (EditTrackingModal)

**Ce que c'est :**
Modifier le numero de suivi d'un bon existant.

**Actions possibles :**
- Changer le numero de tracking
- Changer le transporteur
- Mettre a jour l'URL de suivi
- Annuler completement le fulfillment (bouton rouge)

---

## 13. Impression / Export PDF (DeliveryNotePrint)

**Ce que c'est :**
Genere un bon de livraison formate pret a imprimer.

**Contenu du bon (conforme RG-070) :**
- En-tete : **DECOSHOP TOULOUSE** + "BON DE LIVRAISON"
- Numero BL : format `DECO-BL-YYMMDD-XXXX` (auto-genere)
- Bloc client : nom, email
- Bloc adresse : adresse complete de livraison
- Tableau des articles : designation, SKU, quantite, prix unitaire
- Montant total TTC
- Zone tracking si disponible (transporteur + numero)
- Zones de signature (expediteur + destinataire)
- **Statut signature electronique** : en attente / signe / expire (RG-062, RG-070)

**Pour sauvegarder en PDF (RG-071) :**
Quand la fenetre d'impression s'ouvre → choisir "Enregistrer en PDF" comme imprimante.

---

## 14. Export CSV

**Ce que c'est :**
Telecharge un fichier tableur avec toutes les commandes filtrees.

**Colonnes du fichier :**
Commande | Client | Email | Date | Montant | Devise | Statut | Tracking

**Format :** CSV (ouvrable avec Excel, Google Sheets, etc.)

---

## 15. Dark Mode

**Ce que c'est :**
Bascule entre un theme clair (fond blanc) et un theme sombre (fond noir/gris fonce).

- Bouton lune = passer en sombre
- Bouton soleil = revenir en clair
- Le choix est memorise dans le navigateur
- Detecte automatiquement le theme du systeme au premier lancement

---

## 16. Auto-refresh

**Ce que c'est :**
Rechargement automatique des donnees a intervalles reguliers.

| Option | Comportement |
|--------|-------------|
| Auto: Off | Pas de rechargement automatique |
| 30s | Actualise les commandes toutes les 30 secondes |
| 1 min | Actualise toutes les minutes |
| 5 min | Actualise toutes les 5 minutes |

**Pourquoi c'est utile :**
Pour un ecran de suivi en continu (ex: un ecran dans l'entrepot).

---

## 17. Raccourcis clavier

| Touche | Action |
|--------|--------|
| `/` | Focus sur le champ de recherche |
| `R` | Rafraichir les donnees |
| `Esc` | Fermer le panel/modale ouverte |
| `Ctrl+A` | Selectionner toutes les commandes de la page |

---

## 18. Systeme de notifications (Toast)

**Ce que c'est :**
Des petits messages qui apparaissent en haut a droite pour informer l'utilisateur.

**Types :**
- Vert (success) : "Bon de livraison cree avec succes"
- Rouge (error) : "Erreur lors du chargement"
- Jaune (warning) : "Aucune commande selectionnee"
- Bleu (info) : "3 bons envoyes a l'impression"

Les messages disparaissent automatiquement apres quelques secondes.

---

## 19. Journal API (ApiLog)

**Ce que c'est :**
Un journal technique depliable en bas de page qui trace tous les appels au serveur Shopify.

**Colonnes :**
- Heure de l'appel
- Methode HTTP (GET = lecture, POST = creation, PUT = modification)
- URL appellee
- Code status (200 = OK, 404 = pas trouve, 500 = erreur serveur)
- Duree en millisecondes

---

## 20. Mode Demo

**Ce que c'est :**
Quand aucune boutique Shopify n'est configuree, l'appli affiche des donnees fictives pour tester l'interface.

Un bandeau jaune indique : "Mode demo - Donnees fictives"

Toutes les fonctionnalites sont utilisables (creation, edition, impression) meme en mode demo.

---

# PARTIE 2 : GLOSSAIRE DES TERMES TECHNIQUES

| Terme | Definition simple |
|-------|-------------------|
| **Dashboard** | Tableau de bord, page principale qui affiche tout |
| **Fulfillment** | "Execution" d'une commande = dire que les articles ont ete expedies |
| **Tracking** | Numero de suivi du colis (ex: 6A12345678901) |
| **API** | Interface de programmation — comment notre appli parle a Shopify |
| **REST API** | Type d'API qui utilise des URL et des methodes HTTP (GET, POST, PUT) |
| **Endpoint** | Une URL specifique de l'API (ex: /api/orders pour les commandes) |
| **Token** | Cle secrete qui autorise notre appli a acceder a Shopify |
| **Frontend** | La partie visible (interface, boutons, tableaux) |
| **Backend** | La partie invisible (serveur, API, base de donnees) |
| **Proxy** | Intermediaire — notre serveur Astro transmet les requetes a Shopify |
| **Astro** | Framework web qui genere le site (comme un constructeur de pages) |
| **React** | Librairie pour creer des interfaces interactives (composants) |
| **TypeScript** | Version de JavaScript avec des types (evite les bugs) |
| **Tailwind CSS** | Framework CSS utilitaire pour styliser rapidement |
| **Composant** | Brique reutilisable de l'interface (ex: un bouton, un tableau) |
| **State** | "Etat" d'un composant (ex: la liste des commandes, le filtre actif) |
| **Props** | Parametres passes d'un composant parent a un composant enfant |
| **Hook** | Fonction React speciale (useState, useEffect, useMemo...) |
| **useState** | Hook pour stocker une variable qui peut changer |
| **useEffect** | Hook pour executer du code quand quelque chose change |
| **useMemo** | Hook pour memoriser un calcul couteux et eviter de le refaire |
| **useCallback** | Hook pour memoriser une fonction |
| **useRef** | Hook pour acceder a un element HTML directement |
| **Context** | Systeme pour partager des donnees entre composants sans les passer un par un |
| **localStorage** | Stockage du navigateur qui persiste meme apres fermeture |
| **Dark Mode** | Theme sombre de l'interface |
| **Responsive** | Interface qui s'adapte a la taille de l'ecran (mobile, tablette, PC) |
| **CSV** | Format de fichier tableur (Comma-Separated Values) |
| **PDF** | Format de document imprimable |
| **CORS** | Securite navigateur qui controle les requetes entre domaines |
| **SKU** | Reference article (Stock Keeping Unit) |
| **Webhook** | Notification automatique envoyee par Shopify quand un evenement arrive |
| **Build** | Processus de compilation pour mettre en production |
| **Deploy** | Mettre l'application en ligne sur un serveur |

---

# PARTIE 3 : CE QUI MANQUE POUR ETRE OPERATIONNEL

## A. Obligatoire pour la production

### 1. Fichier .env (configuration Shopify)
**Statut : MANQUANT**

Il faut creer un fichier `.env` a la racine du projet :
```env
SHOPIFY_STORE_URL=votre-boutique.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxx
```

**Comment obtenir le token (RG-080/081) :**
1. Aller dans Shopify Admin → Settings → Apps and sales channels
2. Cliquer sur "Develop apps"
3. Creer une nouvelle app
4. Configurer les scopes API (permissions) :
   - `read_orders` (lire les commandes)
   - `write_fulfillments` (creer des bons de livraison)
   - `read_fulfillments` (lire les bons de livraison)
5. Installer l'app sur la boutique
6. Copier le "Admin API access token"

### 2. Authentification via Supabase Auth
**Statut : SIMPLIFIE (local pour la demo)**

Actuellement les identifiants sont codes en dur (`admin@decoshop.com` / `admin`).
En production, l'auth sera geree par **Supabase Auth** (RG-007, RG-121) :
- Chaque utilisateur a un email + mot de passe dans Supabase
- Les roles (Admin, Vendeur, Livreur) sont definis par RG-001 a RG-006
- Row Level Security (RLS) filtre les donnees par role (RG-112)

> **Pour une soutenance/demo, l'etat actuel est suffisant.**

### 3. Connexion Supabase (base de donnees)
**Statut : NON INTEGRE**

En production, les BL seront stockes dans **Supabase PostgreSQL** (RG-040, RG-110) :
- Table `delivery_notes` pour les BL
- Table `signatures` pour les signatures electroniques
- Bucket `delivery-notes` dans Supabase Storage pour les PDF (RG-114)

### 4. Interface Livreur
**Statut : NON INTEGRE (autre module du groupe)**

Le livreur a une interface dediee (RG-060) qui permet de :
- Voir les BL attribues
- Gerer les creneaux de livraison (CRUD)
- Emettre des demandes de signature electronique
- Marquer les livraisons comme effectuees

---

## B. Recommande (ameliorations)

### 4. Hebergement
L'application n'est pas deployee. Options :
- **Vercel** (gratuit, ideal pour Astro)
- **Netlify** (gratuit, simple)
- **Railway** ou **Render** (si besoin de serveur)

Commande pour deployer :
```bash
npm run build
# puis uploader le dossier dist/
```

### 5. HTTPS
En production, le site DOIT etre en HTTPS (les hebergeurs ci-dessus le fournissent automatiquement).

### 6. Variables d'environnement sur le serveur
Ne jamais commiter le fichier `.env`. Les variables doivent etre configurees directement sur la plateforme d'hebergement.

---

## C. Optionnel (bonus presentation)

| Amelioration | Difficulte | RG concernee | Description |
|-------------|-----------|-------------|-------------|
| Multi-utilisateurs | Moyenne | RG-001 a 007 | Comptes Admin / Vendeur / Livreur via Supabase Auth |
| Signature electronique | Moyenne | RG-061, 062, 126 | Lien temporaire 10 min avec canvas signature |
| Notifications email BL | Moyenne | RG-050, 125 | Envoi BL par email via Resend / Supabase Edge Functions |
| Webhooks Shopify | Avancee | RG-081 | Mise a jour en temps reel sans polling (`orders/create`) |
| Stockage BL en PDF | Facile | RG-072, 114 | Archivage des BL dans Supabase Storage |
| Historique des livraisons | Facile | RG-054, 065 | Tracabilite complete dans la base de donnees |

---

# PARTIE 4 : RESUME POUR LA SOUTENANCE

## Architecture en une phrase
> Le module BL de DECOSHOP est une application web construite avec Astro et React qui se connecte a l'API Shopify pour gerer les bons de livraison, dans le cadre du projet global DecoShop Toulouse.

## Schema d'architecture (module BL)

```
Navigateur (React)               Autres modules du groupe
     |                            - Inventaire + IA Gemini
     v                            - Plan 3D du magasin
Serveur Astro (API routes)        - Interface Livreur
     |                            - Theme Shopify
     v                                   |
API REST Shopify  <----- Webhooks ------+
     |                                   |
     v                                   v
Boutique Shopify        Supabase (PostgreSQL + Auth + Storage)
```

## Regles de gestion respectees dans ce module

| RG | Description | Statut |
|----|-------------|--------|
| RG-052 | Le vendeur cree un BL dans le dashboard | Implemente |
| RG-053 | Le BL est transmis au livreur (pas envoye directement au client) | Implemente |
| RG-054 | Le BL alimente la base de donnees | A integrer (Supabase) |
| RG-070 | Format BL : DECO-BL-YYMMDD-XXXX + mode livraison + signature | Implemente |
| RG-071 | BL genere en PDF | Implemente |
| RG-080 | Connexion API Shopify Admin | Implemente |
| RG-130 | Cles API non exposees cote client (proxy) | Implemente |

## Points forts a presenter

1. **Conforme aux regles de gestion** : format BL, mode livraison, signature electronique
2. **Interface moderne** : dark mode, animations, responsive
3. **Productivite** : actions groupees, raccourcis clavier, auto-refresh
4. **Tracabilite** : journal API, notifications, historique
5. **Export** : PDF bons de livraison (RG-071), CSV commandes
6. **Securite** : authentification, proxy API (le token n'est jamais expose au navigateur, RG-130)
7. **Mode demo** : fonctionne sans configuration Shopify
8. **Pret pour integration** : architecture modulaire, pret a brancher sur Supabase

## Technologies utilisees

| Techno | Role | Pourquoi ce choix |
|--------|------|-------------------|
| Astro v5 | Framework web | Rapide, SSR, API routes integrees |
| React v19 | UI interactive | Ecosysteme riche, composants reactifs |
| TypeScript | Typage | Moins de bugs, autocompletion |
| Tailwind CSS v3 | Style | Rapide a coder, dark mode natif |
| Shopify REST API | Donnees | API officielle, bien documentee |

## Chiffres du projet

| Metrique | Valeur |
|----------|--------|
| Fichiers source | 22 |
| Composants React | 13 |
| Routes API | 4 |
| Fonctionnalites | 20 |
| Raccourcis clavier | 4 |

---

# PARTIE 5 : CHECKLIST AVANT PRESENTATION

- [ ] `npm install` execute sans erreur
- [ ] `npm run dev` lance le serveur sur localhost:4321
- [ ] La page de connexion s'affiche
- [ ] Connexion avec admin@decoshop.com / admin fonctionne
- [ ] Le dashboard s'affiche avec les donnees demo
- [ ] Le bandeau "Mode demo" est visible
- [ ] Les 5 cartes de stats sont visibles
- [ ] Les filtres fonctionnent (cliquer sur "Non exp.", "Expediees", etc.)
- [ ] La recherche filtre en temps reel
- [ ] Le tri par colonne fonctionne
- [ ] La pagination fonctionne
- [ ] Les checkboxes selectionnent les commandes
- [ ] La barre d'actions groupees apparait
- [ ] Le dark mode fonctionne
- [ ] L'export CSV telecharge un fichier
- [ ] L'impression PDF ouvre une fenetre
- [ ] Cliquer sur une ligne ouvre le panneau de details
- [ ] Le bouton "+ Bon" ouvre la modale de creation
- [ ] Les raccourcis clavier fonctionnent (/, R, Esc)
- [ ] Le bouton de deconnexion ramene au login
- [ ] Les analytiques se deplient et affichent les graphiques
