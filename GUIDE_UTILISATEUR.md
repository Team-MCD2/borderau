# DECOSHOP — Guide Utilisateur Complet

> **Plateforme de gestion des bons de livraison**
> Version 1.0 — Avril 2026

---

## Table des matieres

1. [Presentation generale](#1-presentation-generale)
2. [Page de connexion](#2-page-de-connexion)
3. [Tableau de bord principal](#3-tableau-de-bord-principal)
   - 3.1 [Barre de statistiques](#31-barre-de-statistiques)
   - 3.2 [Panneau analytiques](#32-panneau-analytiques)
   - 3.3 [Barre d'outils](#33-barre-doutils)
   - 3.4 [Tableau des commandes](#34-tableau-des-commandes)
   - 3.5 [Pagination](#35-pagination)
4. [Detail d'une commande](#4-detail-dune-commande)
5. [Creer un bon de livraison](#5-creer-un-bon-de-livraison)
6. [Modifier le tracking](#6-modifier-le-tracking)
7. [Telecharger un bon de livraison PDF](#7-telecharger-un-bon-de-livraison-pdf)
8. [Actions groupees (bulk)](#8-actions-groupees-bulk)
9. [Export CSV](#9-export-csv)
10. [Journal des appels API](#10-journal-des-appels-api)
11. [Mode sombre / clair](#11-mode-sombre--clair)
12. [Raccourcis clavier](#12-raccourcis-clavier)
13. [Comptes utilisateurs](#13-comptes-utilisateurs)
14. [FAQ / Depannage](#14-faq--depannage)

---

## 1. Presentation generale

L'application **DECOSHOP** est une plateforme web de gestion des livraisons pour les magasins DecoShop (Toulouse et Paris). Elle permet de :

- **Visualiser** toutes les commandes et bons de livraison
- **Creer** des bons de livraison pour les commandes clients
- **Suivre** l'etat d'expedition (en attente, en cours, livree, signee)
- **Generer** des bons de livraison au format PDF conformes au modele officiel DecoShop
- **Exporter** les donnees en CSV pour analyse
- **Analyser** les performances via des graphiques integres

### Architecture

L'application fonctionne avec une base de donnees SQLite locale. Trois profils utilisateurs sont disponibles :

| Role | Description |
|------|-------------|
| **Admin** | Acces complet a toutes les fonctionnalites |
| **Vendeur** | Cree et gere les bons de livraison |
| **Livreur** | Consulte et met a jour le statut des livraisons |

---

## 2. Page de connexion

### Description

La page de connexion est la premiere interface affichee. Elle protege l'acces au tableau de bord par authentification email/mot de passe.

### Elements de l'interface

- **Logo DECOSHOP** avec animation
- **Champ email** : saisissez votre adresse email professionnelle
- **Champ mot de passe** : saisissez votre mot de passe (avec bouton oeil pour afficher/masquer)
- **Bouton "Se connecter"** : lance l'authentification
- **Encart identifiants** : rappel des identifiants par defaut (visible en bas)

### Comment se connecter

1. Ouvrez l'application dans votre navigateur (`http://localhost:4321`)
2. Saisissez votre **adresse email** dans le premier champ
3. Saisissez votre **mot de passe** dans le second champ
4. Cliquez sur **"Se connecter"** ou appuyez sur `Entree`
5. Si les identifiants sont corrects, vous etes redirige vers le tableau de bord

### Identifiants par defaut

| Profil | Email | Mot de passe |
|--------|-------|--------------|
| Administrateur | `admin@decoshop.com` | `admin` |
| Vendeur | `vendeur@decoshop.com` | `test123` |
| Livreur | `livreur@decoshop.com` | `test123` |

### En cas d'erreur

- **"Email ou mot de passe incorrect"** : verifiez la saisie et reessayez
- **"Impossible de contacter le serveur"** : le serveur n'est pas demarre, lancez `npm run dev`

---

## 3. Tableau de bord principal

Le tableau de bord est l'interface centrale de l'application. Il se compose de plusieurs zones detaillees ci-dessous.

---

### 3.1 Barre de statistiques

Situee tout en haut du tableau de bord, elle affiche **5 cartes de statistiques** en temps reel :

| Carte | Couleur | Description |
|-------|---------|-------------|
| **Total commandes** | Bleu | Nombre total de bons de livraison |
| **Expediees** | Vert | Commandes dont la livraison est terminee |
| **En cours** | Orange | Commandes en cours de livraison |
| **Non expediees** | Rouge | Commandes pas encore expediees |
| **Avec tracking** | Violet | Commandes ayant un numero de suivi |

Les chiffres se mettent a jour automatiquement apres chaque action (creation de BL, modification, etc.).

---

### 3.2 Panneau analytiques

Le panneau analytiques est **repliable**. Par defaut, seul le bouton **"Analytiques"** est visible.

#### Comment l'ouvrir

1. Cliquez sur le bouton **"Analytiques"** (icone graphique)
2. Le panneau se deplie et affiche 3 zones :

#### Contenu du panneau

- **Graphique en barres** (gauche) : nombre de commandes par jour sur les 7 derniers jours. Chaque barre represente un jour (lun, mar, mer...). La hauteur est proportionnelle au nombre de commandes.

- **Graphique en anneau (donut)** (droite) : repartition visuelle des statuts :
  - Vert = Expediees
  - Orange = En cours
  - Rouge = Non expediees
  - Le chiffre au centre indique le nombre total

- **Ligne de KPI** (bas) : 4 indicateurs cles
  - **Commandes** : nombre total
  - **Chiffre d'affaires** : somme de tous les montants
  - **Taux expedition** : pourcentage des commandes expediees
  - **A expedier** : nombre de commandes restantes a traiter

#### Comment le fermer

Cliquez sur la **fleche vers le haut** en haut a droite du panneau.

---

### 3.3 Barre d'outils

La barre d'outils se situe entre les statistiques et le tableau. Elle contient :

#### Filtres de statut (gauche)

4 boutons permettent de filtrer les commandes :

| Bouton | Fonction |
|--------|----------|
| **Toutes** | Affiche toutes les commandes (filtre par defaut) |
| **Non expediees** | Uniquement les commandes pas encore traitees |
| **En cours** | Uniquement les commandes en livraison |
| **Expediees** | Uniquement les commandes livrees |

Le bouton actif est en **bleu fonce**.

#### Outils (droite)

| Icone | Fonction | Raccourci |
|-------|----------|-----------|
| Loupe | **Recherche** : tapez un nom, email, N° commande ou N° tracking | `/` |
| Horloge | **Auto-refresh** : rafraichissement automatique (Off, 30s, 1min, 5min) | — |
| Fleche bas | **Export CSV** : telecharge toutes les commandes filtrees en fichier CSV | — |
| Lune/Soleil | **Mode sombre/clair** : bascule le theme visuel | — |
| Fleches circulaires | **Rafraichir** : recharge les donnees manuellement | `R` |
| Porte | **Deconnexion** : revient a la page de connexion | — |

#### Comment rechercher

1. Cliquez dans le champ de recherche (ou appuyez sur `/`)
2. Tapez votre recherche :
   - **N° commande** : ex. `DECO-BL-260427`
   - **Nom client** : ex. `Benali`
   - **Email** : ex. `amina.benali`
   - **N° tracking** : ex. `1Z999`
3. Les resultats se filtrent **en temps reel** au fur et a mesure de la saisie
4. Appuyez sur `Echap` pour quitter le champ de recherche

#### Comment activer l'auto-refresh

1. Cliquez sur le menu deroulant **"Auto: Off"**
2. Selectionnez la frequence souhaitee :
   - **30s** : actualisation toutes les 30 secondes
   - **1 min** : actualisation toutes les minutes
   - **5 min** : actualisation toutes les 5 minutes
3. Les donnees se rechargent automatiquement a l'intervalle choisi

---

### 3.4 Tableau des commandes

Le tableau est l'element principal. Il affiche la liste de toutes les commandes/bons de livraison.

#### Colonnes

| Colonne | Description |
|---------|-------------|
| ☐ (checkbox) | Case a cocher pour la selection groupee |
| **Commande** | Numero du bon (ex: DECO-BL-260427-0001). Cliquable pour trier |
| **Client** | Nom complet + email du client |
| **Date** | Date de creation. Cliquable pour trier |
| **Montant** | Montant total TTC en EUR. Cliquable pour trier |
| **Statut** | Badge colore (Expediee / En cours / Non expediee). Cliquable pour trier |
| **Tracking** | Numero de suivi (cliquable pour modifier) ou "Ajouter tracking" |
| **Actions** | Boutons d'action rapide |

#### Comment trier le tableau

1. Cliquez sur l'en-tete d'une colonne triable (**Commande**, **Date**, **Montant**, **Statut**)
2. Une fleche apparait indiquant le sens du tri (ascendant ou descendant)
3. Cliquez a nouveau sur la meme colonne pour inverser le sens

#### Comment ouvrir le detail d'une commande

Cliquez n'importe ou sur la **ligne** d'une commande (sauf sur les colonnes checkbox, tracking et actions). Le panneau de detail s'ouvre a droite.

#### Boutons d'action par ligne

- **"+ Bon"** (bleu) : cree un nouveau bon de livraison pour cette commande (visible uniquement si la commande n'est pas encore expediee)
- **Icone imprimante** : ouvre l'apercu du bon de livraison pour telecharger le PDF

---

### 3.5 Pagination

En bas du tableau, une barre de pagination permet de naviguer entre les pages.

#### Elements

- **Compteur** : "8 commandes · Page 1/1"
- **Selecteur "Afficher"** : choisissez 10, 25 ou 50 commandes par page
- **Boutons de navigation** : `««` (premiere page), `‹` (precedente), numeros de pages, `›` (suivante), `»»` (derniere page)

#### Comment changer le nombre d'elements par page

1. Cliquez sur le menu **"Afficher 10 par page"**
2. Selectionnez **10**, **25** ou **50**
3. Le tableau se met a jour immediatement

---

## 4. Detail d'une commande

Le panneau de detail s'ouvre en glissant depuis la droite lorsque vous cliquez sur une commande.

### Contenu du panneau

Le panneau affiche 6 sections :

#### Section "Client"
- Nom complet du client
- Adresse email

#### Section "Adresse de livraison"
- Nom du destinataire
- Adresse complete (rue, code postal, ville, pays)

#### Section "Paiement"
- Montant total (grand format)
- Statut financier

#### Section "Articles"
- Liste de tous les articles de la commande
- Pour chaque article : nom, SKU, quantite, prix unitaire
- Badge de statut par article (Expedie / En attente)

#### Section "Bons de livraison"
- Liste des bons existants avec :
  - Numero du fulfillment
  - Statut (colore)
  - Informations de suivi (N° tracking, transporteur, lien de suivi)
  - Articles inclus
  - Dates de creation et mise a jour
- Bouton **"Editer"** : modifier le tracking
- Bouton **"Imprimer"** : generer le PDF

Si aucun bon n'existe, un bouton **"Creer un bon"** est affiche.

#### Section "Actions"
- Bouton **"Imprimer le recapitulatif complet"** : genere un PDF de l'ensemble de la commande

### Comment fermer le panneau

- Cliquez sur le **X** en haut a droite
- Cliquez sur l'**overlay sombre** a gauche
- Appuyez sur la touche **Echap**

---

## 5. Creer un bon de livraison

### Comment y acceder

- Depuis le **tableau** : cliquez sur le bouton **"+ Bon"** dans la colonne Actions
- Depuis le **detail d'une commande** : cliquez sur **"+ Nouveau bon"** ou **"Creer un bon"**

### Elements du formulaire

#### 1. Recapitulatif des articles
Liste de tous les articles de la commande avec quantites et prix. Tous les articles sont expedies ensemble.

#### 2. Mode de livraison
Deux options sous forme de cartes radio :
- **Livraison domicile** : le colis est livre a l'adresse du client
- **Retrait magasin** : le client vient chercher en boutique

#### 3. Informations de suivi (uniquement en mode domicile)
- **N° de suivi** : numero de tracking du transporteur
- **Transporteur** : liste deroulante (Colissimo, Chronopost, DHL, UPS, FedEx, Mondial Relay, DPD, GLS)
- **URL de suivi** : lien direct vers la page de suivi du colis

#### 4. Notification client
- Case a cocher **"Notifier le client par email"** (cochee par defaut)

### Etapes pour creer un bon

1. Ouvrez le formulaire (voir ci-dessus)
2. Selectionnez le **mode de livraison** (domicile ou retrait)
3. Si livraison domicile, remplissez les **informations de suivi** (optionnel)
4. Cochez/decochez la **notification client** selon votre choix
5. Cliquez sur **"Creer le bon"**
6. Un message de confirmation vert s'affiche : "Bon de livraison cree avec succes"
7. Le tableau se rafraichit automatiquement

---

## 6. Modifier le tracking

### Comment y acceder

- Depuis le **tableau** : cliquez sur le **numero de tracking** (bleu) ou sur **"Ajouter tracking"** dans la colonne Tracking
- Depuis le **detail d'une commande** : cliquez sur **"Editer"** a cote d'un fulfillment

### Elements du formulaire

- **N° de suivi** : champ texte pour le numero de tracking
- **Transporteur** : menu deroulant (Colissimo, Chronopost, DHL, UPS, FedEx, Mondial Relay, DPD, GLS)
- **URL de suivi** : lien vers la page de tracking du transporteur
- **Notification** : case a cocher pour notifier le client par email
- **Articles inclus** : liste en lecture seule des articles concernes

### Etapes pour modifier le tracking

1. Ouvrez le formulaire (voir ci-dessus)
2. Modifiez les champs souhaites
3. Cliquez sur **"Enregistrer"**
4. Un message de confirmation s'affiche

### Annuler un bon de livraison

En bas a gauche du formulaire, le bouton rouge **"Annuler le bon"** permet d'annuler un fulfillment. Une confirmation est demandee avant l'annulation.

---

## 7. Telecharger un bon de livraison PDF

### Description

L'application genere un **vrai fichier PDF** conforme au modele papier officiel DecoShop. Le PDF s'ouvre correctement dans Adobe Reader, tout navigateur ou lecteur PDF.

### Comment y acceder

- Depuis le **tableau** : cliquez sur l'**icone imprimante** dans la colonne Actions
- Depuis le **detail d'une commande** : cliquez sur **"Imprimer"** a cote d'un fulfillment, ou sur **"Imprimer le recapitulatif complet"**

### Contenu du PDF genere

Le PDF reproduit fidelement le modele papier DecoShop :

| Zone | Contenu |
|------|---------|
| **En-tete** | "DECOSHOP" (bleu fonce), "Mobilier design et tendance", FACTURE N°, DATE |
| **Adresses entreprise** | DecoShop Toulouse (3 rue Emile Baudot) + DecoShop Paris (rue Jean Pierre Timbaud) |
| **Bloc CLIENT** | NOM, PRENOM, NUM PHONE, ADRESSE, EMAIL |
| **Tableau articles** | QUANTITE, DESIGNATION, PRIX UNIT, TOTAL (avec lignes vides pour completer la page) |
| **Observations et delais** | Cadre vide pour notes manuelles |
| **Totaux** | TOTAL TTC, ACOMPTE, RESTE A PAYER |
| **Pied de page legal** | Telephones (05.34.51.29.12 / 06.19.68.32.57), email, RCS, TVA |

### Etapes pour telecharger

1. Ouvrez l'apercu du bon (voir ci-dessus)
2. Verifiez les informations dans l'apercu a l'ecran
3. Cliquez sur **"Telecharger PDF"**
4. Le fichier se telecharge automatiquement avec le nom : `DECO-BL-AAMMJJ-XXXX.pdf`
5. Ouvrez le fichier avec Adobe Reader ou tout lecteur PDF

---

## 8. Actions groupees (bulk)

Les actions groupees permettent de traiter **plusieurs commandes en meme temps**.

### Comment selectionner des commandes

- **Selection individuelle** : cochez la case a gauche de chaque commande
- **Tout selectionner** : cochez la case dans l'en-tete du tableau (ou `Ctrl+A`)
- **Deselectionner** : cliquez sur le X dans la barre bleue

### Barre d'actions groupees

Lorsque des commandes sont selectionnees, une **barre bleue** apparait en haut :

| Element | Description |
|---------|-------------|
| **Compteur** | Nombre de commandes selectionnees (ex: "3 commandes selectionnees") |
| **"Creer bons en masse"** | Cree un bon de livraison pour chaque commande non expediee selectionnee |
| **"Exporter PDF"** | Genere et imprime les bons de toutes les commandes selectionnees |
| **X** | Deselectionner tout |

### Etapes pour creer des bons en masse

1. Cochez les commandes souhaitees
2. Cliquez sur **"Creer bons en masse"**
3. L'application traite chaque commande une par une
4. Un message recapitulatif s'affiche (ex: "3 bon(s) crees avec succes")
5. La selection se vide automatiquement

### Etapes pour exporter les PDF en masse

1. Cochez les commandes souhaitees
2. Cliquez sur **"Exporter PDF"**
3. Une nouvelle fenetre s'ouvre avec tous les bons (un par page)
4. La fenetre d'impression du navigateur s'ouvre automatiquement
5. Choisissez **"Enregistrer en PDF"** ou imprimez directement

---

## 9. Export CSV

### Description

L'export CSV genere un fichier tableur compatible Excel, Google Sheets, LibreOffice, etc.

### Contenu du fichier CSV

Chaque ligne represente une commande avec les colonnes :

| Colonne | Exemple |
|---------|---------|
| Commande | DECO-BL-260427-0001 |
| Client | Amina Benali |
| Email | amina.benali@gmail.com |
| Date | 27/04/2026 |
| Montant | 248.00 |
| Devise | EUR |
| Statut | cree |
| Tracking | 1Z999AA10123456784 |

### Etapes

1. Appliquez vos **filtres** si necessaire (statut, recherche)
2. Cliquez sur l'**icone de telechargement** (fleche vers le bas) dans la barre d'outils
3. Le fichier `commandes-AAAA-MM-JJ.csv` est telecharge
4. Ouvrez-le avec Excel ou un tableur
5. Un message de confirmation vert s'affiche : "X commande(s) exportee(s) en CSV"

> **Note** : seules les commandes visibles apres filtrage sont exportees.

---

## 10. Journal des appels API

### Description

Le journal API est un outil technique qui enregistre tous les appels reseau effectues par l'application. Il est utile pour le diagnostic en cas de probleme.

### Comment y acceder

En bas de la page du tableau de bord, cliquez sur **"Journal API (X appels)"**. Le panneau se deplie.

### Informations affichees

| Colonne | Description |
|---------|-------------|
| **Heure** | Horodatage de l'appel (HH:MM:SS) |
| **Methode** | Type de requete (GET = bleu, POST = vert, PUT = jaune) |
| **URL** | Endpoint API appele |
| **Status** | Code HTTP (200 = vert = succes, 400+ = rouge = erreur) |
| **Duree** | Temps de reponse en millisecondes |

Les lignes en **rouge** indiquent des appels en erreur.

---

## 11. Mode sombre / clair

L'application supporte deux themes visuels :

- **Mode clair** : fond blanc, texte sombre (adapte aux environnements lumineux)
- **Mode sombre** : fond gris fonce, texte clair (reduit la fatigue oculaire)

### Comment basculer

Cliquez sur l'**icone lune** (pour passer en mode sombre) ou l'**icone soleil** (pour passer en mode clair) dans la barre d'outils.

Le choix est **memorise** pour votre prochaine visite.

---

## 12. Raccourcis clavier

L'application propose des raccourcis clavier pour une utilisation plus rapide :

| Raccourci | Action |
|-----------|--------|
| `/` | Placer le curseur dans le champ de recherche |
| `R` | Rafraichir les donnees |
| `Echap` | Fermer le panneau/modale ouverte, ou quitter le champ de recherche |
| `Ctrl + A` | Selectionner/deselectionner toutes les commandes de la page |

> **Note** : les raccourcis ne fonctionnent que lorsque le curseur n'est pas dans un champ de saisie (sauf Echap).

---

## 13. Comptes utilisateurs

### Roles disponibles

| Role | Connexion | Voir commandes | Creer BL | Modifier tracking | Export | Admin |
|------|-----------|----------------|----------|-------------------|--------|-------|
| **Admin** | Oui | Oui | Oui | Oui | Oui | Oui |
| **Vendeur** | Oui | Oui | Oui | Oui | Oui | Non |
| **Livreur** | Oui | Oui | Non | Oui | Non | Non |

### Comptes pre-configures

| Profil | Email | Mot de passe | Role |
|--------|-------|--------------|------|
| Admin | `admin@decoshop.com` | `admin` | Administrateur |
| Sophie Martin | `vendeur@decoshop.com` | `test123` | Vendeur |
| Lucas Dupont | `livreur@decoshop.com` | `test123` | Livreur |

### Deconnexion

Cliquez sur l'**icone porte** (rouge) en haut a droite de la barre d'outils. Vous serez redirige vers la page de connexion.

---

## 14. FAQ / Depannage

### Le serveur ne repond pas

1. Verifiez que le serveur est lance : `npm run dev` dans le dossier du projet
2. Attendez le message "astro ready" dans le terminal
3. Ouvrez `http://localhost:4321` dans votre navigateur

### Je ne peux pas me connecter

1. Verifiez que vous utilisez le bon email et mot de passe
2. Les identifiants par defaut sont `admin@decoshop.com` / `admin`
3. Si le probleme persiste, supprimez le fichier `data/decoshop.db` et relancez le serveur pour recreer la base de donnees

### Le PDF ne s'ouvre pas dans Adobe Reader

Ce probleme a ete resolu. L'application genere maintenant un **vrai PDF natif** via jsPDF. Si vous avez un ancien fichier qui ne s'ouvre pas, re-telechargez le bon depuis l'application.

### Les donnees ne se mettent pas a jour

1. Cliquez sur le bouton **Rafraichir** ou appuyez sur `R`
2. Activez l'**auto-refresh** (30s, 1min ou 5min)
3. Verifiez votre connexion reseau

### Comment reinitialiser la base de donnees

1. Arretez le serveur (`Ctrl+C` dans le terminal)
2. Supprimez le fichier `data/decoshop.db`
3. Relancez le serveur avec `npm run dev`
4. La base sera recree automatiquement avec les donnees de test

### L'interface est lente

1. Reduisez le nombre d'elements par page (10 au lieu de 50)
2. Desactivez l'auto-refresh si non necessaire
3. Fermez le panneau analytiques quand il n'est pas utilise

---

> **DECOSHOP** &copy; 2026 — Tous droits reserves
> Mobilier design et tendance
> 3 rue Emile Baudot, 31100 Toulouse | Rue Jean Pierre Timbaud, 78520 Limay
> 05.34.51.29.12 / 06.19.68.32.57 | DECOSHOPTOULOUSE@GMAIL.COM
