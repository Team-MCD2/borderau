// ============================================================
// src/lib/db.ts — SQLite database (better-sqlite3)
// ============================================================
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', '..', 'data', 'decoshop.db');

// --------------- Singleton ---------------

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

// --------------- Schema (conforme MCD/MLD) ---------------

function initSchema(db: Database.Database) {
  db.exec(`
    -- ===== Profiles / Utilisateurs =====
    CREATE TABLE IF NOT EXISTS profiles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      nom           TEXT    NOT NULL DEFAULT '',
      prenom        TEXT    NOT NULL DEFAULT '',
      telephone     TEXT    NOT NULL DEFAULT '',
      role          TEXT    NOT NULL DEFAULT 'vendeur'
                    CHECK (role IN ('admin', 'vendeur', 'vendeur_proprietaire', 'livreur')),
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Catégories (= Collections Shopify) =====
    CREATE TABLE IF NOT EXISTS categories (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                   TEXT    NOT NULL UNIQUE,
      couleur_affichage     TEXT    NOT NULL DEFAULT '#8B7355',
      icone                 TEXT,
      shopify_collection_id TEXT,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Couleurs =====
    CREATE TABLE IF NOT EXISTS couleurs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nom_distinct TEXT    NOT NULL,
      ref_couleur  TEXT,
      hex_code     TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Sections du magasin (1-14) =====
    CREATE TABLE IF NOT EXISTS sections (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      numero            INTEGER NOT NULL UNIQUE CHECK (numero BETWEEN 1 AND 14),
      label             TEXT    NOT NULL,
      categorie_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      x                 REAL    NOT NULL DEFAULT 0,
      y                 REAL    NOT NULL DEFAULT 0,
      largeur_cm        REAL    NOT NULL DEFAULT 100,
      profondeur_cm     REAL    NOT NULL DEFAULT 50,
      hauteur_cm        REAL    NOT NULL DEFAULT 200,
      rotation_deg      REAL    NOT NULL DEFAULT 0,
      couleur_affichage TEXT    NOT NULL DEFAULT '#8B7355',
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Zones fonctionnelles =====
    CREATE TABLE IF NOT EXISTS zones_fonctionnelles (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      label             TEXT    NOT NULL,
      type_zone         TEXT    NOT NULL CHECK (type_zone IN ('office','checkout','entrance','storage','palettes')),
      x                 REAL    NOT NULL DEFAULT 0,
      y                 REAL    NOT NULL DEFAULT 0,
      largeur_cm        REAL    NOT NULL DEFAULT 100,
      profondeur_cm     REAL    NOT NULL DEFAULT 100,
      couleur_affichage TEXT    NOT NULL DEFAULT '#E5E7EB',
      icone             TEXT    DEFAULT '📦',
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Étages (par section) =====
    CREATE TABLE IF NOT EXISTS etages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id   INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      index_etage  INTEGER NOT NULL,
      hauteur_cm   REAL    NOT NULL,
      capacite     INTEGER NOT NULL DEFAULT 10,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (section_id, index_etage)
    );

    -- ===== Articles =====
    CREATE TABLE IF NOT EXISTS articles (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_article     TEXT    NOT NULL UNIQUE,
      description        TEXT    NOT NULL DEFAULT '',
      marque             TEXT,
      modele             TEXT,
      categorie_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      couleur_id         INTEGER REFERENCES couleurs(id) ON DELETE SET NULL,
      ref_couleur        TEXT,
      prix_achat         REAL    DEFAULT 0,
      prix_vente         REAL    DEFAULT 0,
      marge              REAL    GENERATED ALWAYS AS (prix_vente - prix_achat) STORED,
      quantite           INTEGER NOT NULL DEFAULT 0,
      photo_url          TEXT,
      code_barres        TEXT,
      taille             TEXT,
      taille_canape      TEXT,
      shopify_product_id TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Placements produit (sur étagères) =====
    CREATE TABLE IF NOT EXISTS placements_produit (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id         INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      etage_id           INTEGER NOT NULL REFERENCES etages(id) ON DELETE CASCADE,
      position_x         REAL    DEFAULT 0,
      largeur_affichage  REAL    DEFAULT 1,
      hauteur_affichage  REAL    DEFAULT 1,
      ordre_tri          INTEGER DEFAULT 0,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Clients =====
    CREATE TABLE IF NOT EXISTS clients (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                  TEXT    NOT NULL,
      prenom               TEXT,
      email                TEXT,
      telephone            TEXT,
      adresse              TEXT,
      shopify_customer_id  TEXT,
      created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Commandes =====
    CREATE TABLE IF NOT EXISTS commandes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id         INTEGER NOT NULL REFERENCES clients(id),
      numero_commande   TEXT    NOT NULL UNIQUE,
      shopify_order_id  TEXT,
      statut            TEXT    NOT NULL DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente','en_preparation','expediee','livree','annulee')),
      montant_total_ttc REAL    DEFAULT 0,
      date_commande     TEXT    NOT NULL DEFAULT (datetime('now')),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Bons de Livraison =====
    CREATE TABLE IF NOT EXISTS bons_livraison (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_bl         TEXT    NOT NULL UNIQUE,
      commande_id       INTEGER REFERENCES commandes(id),
      vendeur_id        INTEGER REFERENCES profiles(id),
      livreur_id        INTEGER REFERENCES profiles(id),
      client_id         INTEGER REFERENCES clients(id),
      statut            TEXT    NOT NULL DEFAULT 'cree'
                        CHECK (statut IN ('cree','confirme','en_livraison','livre','signe')),
      mode_livraison    TEXT    NOT NULL DEFAULT 'domicile'
                        CHECK (mode_livraison IN ('domicile','retrait_magasin')),
      montant_total_ttc REAL    DEFAULT 0,
      pdf_url           TEXT,
      date_creation     TEXT    NOT NULL DEFAULT (datetime('now')),
      date_livraison    TEXT
    );

    -- ===== Lignes de BL =====
    CREATE TABLE IF NOT EXISTS lignes_bl (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      bl_id          INTEGER NOT NULL REFERENCES bons_livraison(id) ON DELETE CASCADE,
      article_id     INTEGER REFERENCES articles(id),
      designation    TEXT    NOT NULL,
      quantite       INTEGER NOT NULL DEFAULT 1,
      prix_unitaire  REAL    NOT NULL DEFAULT 0,
      total_ligne    REAL    GENERATED ALWAYS AS (quantite * prix_unitaire) STORED
    );

    -- ===== Créneaux de livraison =====
    CREATE TABLE IF NOT EXISTS creneaux_livraison (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      livreur_id  INTEGER NOT NULL REFERENCES profiles(id),
      date_creneau TEXT   NOT NULL,
      heure_debut TEXT    NOT NULL,
      heure_fin   TEXT    NOT NULL,
      statut      TEXT    NOT NULL DEFAULT 'disponible'
                  CHECK (statut IN ('disponible','reserve','termine')),
      bl_id       INTEGER REFERENCES bons_livraison(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Signatures électroniques =====
    CREATE TABLE IF NOT EXISTS signatures_electroniques (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      bl_id            INTEGER NOT NULL UNIQUE REFERENCES bons_livraison(id),
      token            TEXT    NOT NULL UNIQUE,
      email_client     TEXT    NOT NULL,
      statut           TEXT    NOT NULL DEFAULT 'en_attente'
                       CHECK (statut IN ('en_attente','signe','expire')),
      signature_data   TEXT,
      date_emission    TEXT    NOT NULL DEFAULT (datetime('now')),
      date_expiration  TEXT    NOT NULL,
      date_signature   TEXT
    );

    -- ===== Cache commandes Shopify =====
    CREATE TABLE IF NOT EXISTS orders_cache (
      shopify_id         BIGINT  PRIMARY KEY,
      order_name         TEXT    NOT NULL,
      email              TEXT,
      data_json          TEXT    NOT NULL,
      financial_status   TEXT,
      fulfillment_status TEXT,
      total_price        REAL,
      created_at         TEXT    NOT NULL,
      cached_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ===== Index de performance =====
    CREATE INDEX IF NOT EXISTS idx_articles_categorie ON articles(categorie_id);
    CREATE INDEX IF NOT EXISTS idx_etages_section ON etages(section_id);
    CREATE INDEX IF NOT EXISTS idx_placements_etage ON placements_produit(etage_id);
    CREATE INDEX IF NOT EXISTS idx_placements_article ON placements_produit(article_id);
    CREATE INDEX IF NOT EXISTS idx_bl_statut ON bons_livraison(statut);
    CREATE INDEX IF NOT EXISTS idx_bl_livreur ON bons_livraison(livreur_id);
  `);

  // --------------- Seeds ---------------
  seedDefaultAdmin(db);
  seedDefaultCategories(db);
  seedDefaultCouleurs(db);
  seedDefaultSections(db);
  seedDefaultZones(db);
  seedDefaultArticles(db);
}

// --------------- Seed helpers ---------------

function seedDefaultAdmin(db: Database.Database) {
  const exists = db.prepare('SELECT id FROM profiles WHERE email = ?').get('admin@decoshop.com');
  if (!exists) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(
      `INSERT INTO profiles (email, password_hash, nom, prenom, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run('admin@decoshop.com', hash, 'DecoShop', 'Admin', 'admin');
    console.log('[DB] Admin par défaut créé : admin@decoshop.com / admin');
  }
}

function seedDefaultCategories(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c;
  if (count > 0) return;

  // Catégories conformes au MCD
  const cats: [string, string][] = [
    ['Divers / Spirituel', '#D4AF37'],
    ['Cuisine / Arts de la table', '#8B4513'],
    ['Électroménager', '#7F8C8D'],
    ['Textile maison', '#1E3A8A'],
    ['Livres / Spirituel', '#4A4A4A'],
    ['Ustensiles', '#CD853F'],
    ['Céramique / Verre', '#C4A777'],
    ['Thé & Service', '#B8860B'],
    ['Verrerie / Service', '#DAA520'],
    ['Collections marque', '#34495E'],
    ['Voilages & Rideaux', '#2C3E50'],
    ['Rideaux & Textile canapé', '#7F8C8D'],
    ['Encens & Parfums', '#D35400'],
    ['Mixte / Palettes', '#C0392B'],
  ];

  const stmt = db.prepare('INSERT INTO categories (nom, couleur_affichage) VALUES (?, ?)');
  const tx = db.transaction(() => {
    for (const c of cats) stmt.run(...c);
  });
  tx();
  console.log('[DB] 14 catégories créées');
}

function seedDefaultCouleurs(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM couleurs').get() as any).c;
  if (count > 0) return;

  const couleurs: [string, string, string][] = [
    ['Blanc', '001', '#FFFFFF'],
    ['Noir', '002', '#000000'],
    ['Beige', '003', '#F5F5DC'],
    ['Gris', '004', '#808080'],
    ['Bleu nuit', '020', '#1E3A8A'],
    ['Bordeaux', '021', '#800020'],
    ['Or', '030', '#FFD700'],
    ['Argent', '031', '#C0C0C0'],
    ['Rouge', '035', '#DC2626'],
    ['Vert', '040', '#22C55E'],
    ['Marron', '050', '#8B4513'],
    ['Rose', '060', '#EC4899'],
    ['Crème', '070', '#FFFDD0'],
    ['Taupe', '080', '#483C32'],
  ];

  const stmt = db.prepare('INSERT INTO couleurs (nom_distinct, ref_couleur, hex_code) VALUES (?, ?, ?)');
  const tx = db.transaction(() => {
    for (const c of couleurs) stmt.run(...c);
  });
  tx();
  console.log('[DB] 14 couleurs créées');
}

function seedDefaultSections(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM sections').get() as any).c;
  if (count > 0) return;

  // Sections conformes au MCD avec coordonnées du plan en forme de P
  // [numero, label, x, y, largeur_cm, profondeur_cm, hauteur_cm, couleur_affichage]
  const sections: [number, string, number, number, number, number, number, string][] = [
    [1,  'Section 1',              2.5, 0.0, 150, 60, 200, '#D4AF37'],
    [2,  'Section 2',              4.2, 0.0, 150, 60, 200, '#CD853F'],
    [3,  'Section 3',              5.9, 0.0, 150, 60, 200, '#8B4513'],
    [4,  'Section 4 (Comptoir)',   8.5, 1.5, 200, 80, 110, '#1E3A8A'],
    [5,  'Section 5',              2.5, 2.5, 130, 50, 200, '#A0522D'],
    [6,  'Section 6',              4.0, 2.5, 130, 50, 200, '#DAA520'],
    [7,  'Section 7',              5.5, 2.5, 130, 50, 200, '#C4A777'],
    [8,  'Section 8',              2.5, 3.8, 130, 50, 220, '#8B7355'],
    [9,  'Section 9',              4.0, 3.8, 130, 50, 200, '#B8860B'],
    [10, 'Section 10',             5.5, 3.8, 130, 50, 200, '#CD853F'],
    [11, 'Section 11',             1.5, 6.0, 300, 80, 220, '#34495E'],
    [12, 'Section 12',             7.0, 5.5, 200, 60, 200, '#7F8C8D'],
    [13, 'Section 13',             6.5, 7.0, 100, 50, 200, '#D35400'],
    [14, 'Section 14',             8.5, 7.0, 120, 50, 200, '#C0392B'],
  ];

  const stmt = db.prepare(
    'INSERT INTO sections (numero, label, x, y, largeur_cm, profondeur_cm, hauteur_cm, couleur_affichage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const s of sections) stmt.run(...s);
  });
  tx();
  console.log('[DB] 14 sections créées');
}

function seedDefaultZones(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM zones_fonctionnelles').get() as any).c;
  if (count > 0) return;

  const zones: [string, string, number, number, number, number, string, string][] = [
    ['Entrée',   'entrance', 0.0, 3.3, 150, 120, '#10B981', '🚪'],
    ['Caisse',   'checkout', 0.5, 0.0, 150, 100, '#F59E0B', '💳'],
    ['Bureau',   'office',   4.5, 6.5, 200, 150, '#6366F1', '🖥️'],
    ['Stock',    'storage',  9.0, 4.5, 150, 200, '#EF4444', '📦'],
    ['Palettes', 'palettes', 7.2, 6.8, 150, 100, '#9CA3AF', '🪵'],
  ];

  const stmt = db.prepare(
    'INSERT INTO zones_fonctionnelles (label, type_zone, x, y, largeur_cm, profondeur_cm, couleur_affichage, icone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const z of zones) stmt.run(...z);
  });
  tx();
  console.log('[DB] 5 zones fonctionnelles créées');
}

function seedDefaultArticles(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM articles').get() as any).c;
  if (count > 0) return;

  // Catalogue réel DecoShop Toulouse — sections 1 à 14
  // [description, section_numero, category_name_MCD]
  const catalog: [string, number, string][] = [
    // Section 1 — Divers / Spirituel
    ['Eau bénite', 1, 'Divers / Spirituel'],
    ['Planche à dessin avec projection', 1, 'Divers / Spirituel'],
    ['Lampe en forme de lune', 1, 'Divers / Spirituel'],
    ['Mobile pour bébé', 1, 'Divers / Spirituel'],
    ['Ourson', 1, 'Divers / Spirituel'],
    ['Tapis de prière électronique', 1, 'Divers / Spirituel'],
    ['Veilleuse', 1, 'Divers / Spirituel'],
    ['Lessive', 1, 'Divers / Spirituel'],
    ['Bouteilles en verre', 1, 'Céramique / Verre'],
    ['Moule à pâtisserie', 1, 'Cuisine / Arts de la table'],
    // Section 2 — Cuisine / Arts de la table
    ['Brûleur d\'encens', 2, 'Encens & Parfums'],
    ['Kit de casseroles', 2, 'Cuisine / Arts de la table'],
    ['Pot à épices', 2, 'Cuisine / Arts de la table'],
    ['Couteau', 2, 'Ustensiles'],
    ['Plateau à thé', 2, 'Cuisine / Arts de la table'],
    ['Plateau inox', 2, 'Cuisine / Arts de la table'],
    ['Saladier inox', 2, 'Cuisine / Arts de la table'],
    ['Plaque à induction', 2, 'Électroménager'],
    ['Cocotte', 2, 'Cuisine / Arts de la table'],
    ['Cocotte avec revêtement antiadhésif', 2, 'Cuisine / Arts de la table'],
    ['Dessous argenté et doré (pâtisserie)', 2, 'Cuisine / Arts de la table'],
    ['Power kitchen machine', 2, 'Électroménager'],
    // Section 3 — Électroménager
    ['Mélangeur de lait', 3, 'Électroménager'],
    ['Air fryer', 3, 'Électroménager'],
    ['Lessive (lot)', 3, 'Divers / Spirituel'],
    ['Marmite', 3, 'Cuisine / Arts de la table'],
    ['Kit poêles et casseroles', 3, 'Cuisine / Arts de la table'],
    ['Kit poêles', 3, 'Cuisine / Arts de la table'],
    ['Sopalin', 3, 'Divers / Spirituel'],
    ['Papier toilette', 3, 'Divers / Spirituel'],
    // Section 4 — Textile (Comptoir frontal)
    ['Plaid', 4, 'Textile maison'],
    ['Taie d\'oreiller', 4, 'Textile maison'],
    ['Drap housse', 4, 'Textile maison'],
    // Section 5 — Livres / Spirituel
    ['Livre', 5, 'Livres / Spirituel'],
    ['Planche à dessin avec projection', 5, 'Livres / Spirituel'],
    ['Coran', 5, 'Livres / Spirituel'],
    ['Boîte pour ranger le Coran', 5, 'Livres / Spirituel'],
    ['Jeu de cartes', 5, 'Livres / Spirituel'],
    ['Poêle en fonte pour faire le pain', 5, 'Cuisine / Arts de la table'],
    ['Boîte de bonbons', 5, 'Divers / Spirituel'],
    ['Pot à sucre', 5, 'Cuisine / Arts de la table'],
    ['Pot à épices', 5, 'Cuisine / Arts de la table'],
    ['Lessive (section 5)', 5, 'Divers / Spirituel'],
    ['Casseroles (lot de 3)', 5, 'Cuisine / Arts de la table'],
    // Section 6 — Ustensiles
    ['Couverture pour micro-ondes', 6, 'Ustensiles'],
    ['Coffret de couverts', 6, 'Ustensiles'],
    ['Bouilloire avec socle', 6, 'Électroménager'],
    ['Ustensiles en bois', 6, 'Ustensiles'],
    ['Couteau (section 6)', 6, 'Ustensiles'],
    ['Ustensiles en inox', 6, 'Ustensiles'],
    ['Set soup lunch box', 6, 'Ustensiles'],
    // Section 7 — Céramique / Verre
    ['Bouilloire', 7, 'Céramique / Verre'],
    ['Pot en céramique', 7, 'Céramique / Verre'],
    ['Bol en céramique', 7, 'Céramique / Verre'],
    ['Saladier en verre', 7, 'Céramique / Verre'],
    // Section 8 — Thé & Service
    ['Parfum', 8, 'Encens & Parfums'],
    ['Verres à thé', 8, 'Thé & Service'],
    ['Pot à sucre en verre', 8, 'Thé & Service'],
    ['Théière en verre', 8, 'Thé & Service'],
    ['Théière en céramique', 8, 'Céramique / Verre'],
    ['Coffret de couverts (section 8)', 8, 'Thé & Service'],
    ['Pot à bonbons en verre', 8, 'Thé & Service'],
    ['Alcohol stove shelf', 8, 'Thé & Service'],
    ['Petite assiette en inox', 8, 'Thé & Service'],
    // Section 9 — Verrerie / Service
    ['Distributeur 3 litres', 9, 'Verrerie / Service'],
    ['Théière en plastique', 9, 'Verrerie / Service'],
    ['Pot à sucre (section 9)', 9, 'Verrerie / Service'],
    ['Pot de décoration', 9, 'Verrerie / Service'],
    ['Pot à bonbons', 9, 'Verrerie / Service'],
    ['Service carafe et verres', 9, 'Verrerie / Service'],
    ['Pot en verre', 9, 'Verrerie / Service'],
    ['Bol en verre', 9, 'Verrerie / Service'],
    ['Saucier', 9, 'Verrerie / Service'],
    ['Verre à pied', 9, 'Verrerie / Service'],
    // Section 10 — Collections marque
    ['Terra', 10, 'Collections marque'],
    ['Chubby Snack', 10, 'Collections marque'],
    ['Capital Snack', 10, 'Collections marque'],
    ['Egg', 10, 'Collections marque'],
    ['Capital Tea', 10, 'Collections marque'],
    ['Verre à café et saucier', 10, 'Collections marque'],
    ['Tasse à thé et saucier', 10, 'Collections marque'],
    ['Capital Coffee', 10, 'Collections marque'],
    ['Linen', 10, 'Textile maison'],
    // Section 11 — Voilages & Rideaux
    ['Voilage', 11, 'Voilages & Rideaux'],
    ['Voilage brodé', 11, 'Voilages & Rideaux'],
    ['Rideau linen', 11, 'Voilages & Rideaux'],
    ['Rideau velvet', 11, 'Voilages & Rideaux'],
    ['Rideau occultant', 11, 'Voilages & Rideaux'],
    // Section 12 — Rideaux & Textile canapé
    ['Rideau occultant (section 12)', 12, 'Rideaux & Textile canapé'],
    ['Drap housse pour canapé', 12, 'Rideaux & Textile canapé'],
    // Section 13 — Mixte
    ['Drap housse canapé', 13, 'Rideaux & Textile canapé'],
    ['Babouches', 13, 'Textile maison'],
    ['Voile', 13, 'Textile maison'],
    ['Lalezar', 13, 'Textile maison'],
    ['Qamis', 13, 'Divers / Spirituel'],
    ['Coran (section 13)', 13, 'Livres / Spirituel'],
    ['Porte-Coran', 13, 'Livres / Spirituel'],
    ['Brûleur d\'encens (section 13)', 13, 'Encens & Parfums'],
    ['Cuisine (ustensiles divers)', 13, 'Ustensiles'],
    ['Four', 13, 'Électroménager'],
    // Section 14 — Mixte / Palettes
    ['Verre à thé', 14, 'Mixte / Palettes'],
    ['Assiette', 14, 'Mixte / Palettes'],
    ['Vase', 14, 'Mixte / Palettes'],
    ['Tableau', 14, 'Mixte / Palettes'],
    ['Four (section 14)', 14, 'Électroménager'],
    ['Support', 14, 'Mixte / Palettes'],
    ['Saladier en inox', 14, 'Mixte / Palettes'],
    ['Tapis pour la cuisine', 14, 'Mixte / Palettes'],
    ['Air fryer (palette)', 14, 'Électroménager'],
    ['Bol', 14, 'Mixte / Palettes'],
    ['Assiette (palette)', 14, 'Mixte / Palettes'],
    ['Marmite inox', 14, 'Cuisine / Arts de la table'],
    ['Tapis de prière', 14, 'Divers / Spirituel'],
    ['Cocotte (palette)', 14, 'Cuisine / Arts de la table'],
    ['Couscoussier', 14, 'Cuisine / Arts de la table'],
    ['Verres à thé (palette)', 14, 'Mixte / Palettes'],
    ['Plateau inox (palette)', 14, 'Mixte / Palettes'],
    ['Plateaux ovales dorés et inox', 14, 'Mixte / Palettes'],
  ];

  // Map category names to IDs
  const catRows = db.prepare('SELECT id, nom FROM categories').all() as { id: number; nom: string }[];
  const catMap = new Map(catRows.map((c) => [c.nom, c.id]));

  // Map section numero to ID
  const secRows = db.prepare('SELECT id, numero FROM sections').all() as { id: number; numero: number }[];
  const secMap = new Map(secRows.map((s) => [s.numero, s.id]));

  const stmt = db.prepare(`
    INSERT INTO articles (numero_article, description, categorie_id, quantite)
    VALUES (?, ?, ?, ?)
  `);

  let idx = 0;
  const tx = db.transaction(() => {
    for (const [desc, sectionNumero, catName] of catalog) {
      idx++;
      const num = String(idx).padStart(6, '0');
      const articleNumber = `DECO-260427-${num}`;
      const categoryId = catMap.get(catName) ?? null;
      stmt.run(articleNumber, desc, categoryId, 1);
    }
  });
  tx();
  console.log(`[DB] ${catalog.length} articles du catalogue DecoShop insérés`);
}

// --------------- BL Number Generator ---------------

export function generateBlNumber(db: Database.Database): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `DECO-BL-${yy}${mm}${dd}`;

  const row = db.prepare(
    `SELECT COUNT(*) as c FROM bons_livraison WHERE numero_bl LIKE ?`
  ).get(`${prefix}%`) as { c: number };

  const seq = String(row.c + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

// --------------- Orders cache helpers ---------------

export function cacheOrders(db: Database.Database, orders: any[]) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO orders_cache
      (shopify_id, order_name, email, data_json, financial_status, fulfillment_status, total_price, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const o of orders) {
      stmt.run(
        o.id,
        o.name,
        o.email,
        JSON.stringify(o),
        o.financial_status,
        o.fulfillment_status,
        parseFloat(o.total_price),
        o.created_at,
      );
    }
  });
  tx();
}

export function getCachedOrders(db: Database.Database): any[] {
  const rows = db.prepare(
    'SELECT data_json FROM orders_cache ORDER BY created_at DESC'
  ).all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json));
}
