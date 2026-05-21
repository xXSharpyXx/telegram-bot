// node:sqlite is stable in Node.js 24+ — no native compilation required
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/bot.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);

function setupDatabase() {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      wallet_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      weight TEXT,
      is_digital INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      total_eur REAL NOT NULL,
      crypto TEXT,
      crypto_amount REAL,
      wallet_address TEXT,
      nowpayments_id TEXT,
      status TEXT DEFAULT 'pending',
      order_type TEXT DEFAULT 'purchase',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER DEFAULT 1,
      price_eur REAL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT,
      amount_eur REAL,
      description TEXT,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  insertDemoData();
  console.log('[DB] Database ready at', DB_PATH);
}

function insertDemoData() {
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount > 0) return;

  const insertCat = db.prepare(
    'INSERT INTO categories (name, emoji, description, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertProd = db.prepare(
    `INSERT INTO products (category_id, name, description, price, weight, is_digital)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    const merch = Number(insertCat.run('Merch', '👕', 'Vêtements et accessoires de la marque', 1).lastInsertRowid);
    const formations = Number(insertCat.run('Formations', '🎓', 'Formations en ligne DeFi, NFT et crypto', 2).lastInsertRowid);
    const digital = Number(insertCat.run('Digital', '💾', 'Produits numériques téléchargeables', 3).lastInsertRowid);
    const packs = Number(insertCat.run('Packs', '📦', 'Packs combinant plusieurs produits', 4).lastInsertRowid);

    insertProd.run(merch, 'T-Shirt Logo', 'T-shirt premium 100% coton avec logo brodé', 34, '280g', 0);
    insertProd.run(merch, 'Hoodie Oversize', 'Hoodie oversize confort ultime', 59, '520g', 0);
    insertProd.run(merch, 'Casquette Brodée', 'Casquette snapback logo brodé', 22, '120g', 0);
    insertProd.run(merch, 'Mug Céramique', 'Mug céramique 350ml impression HD', 18, '380g', 0);

    insertProd.run(formations, 'Formation DeFi Pro', 'Maîtrisez la finance décentralisée de A à Z', 149, 'digital', 1);
    insertProd.run(formations, 'Pack NFT Avancé', 'Créez, mintez et vendez vos NFTs', 299, 'digital', 1);

    insertProd.run(digital, 'Preset Pack Lightroom', '50 presets Lightroom style crypto/tech', 19, 'digital', 1);
    insertProd.run(digital, 'Ebook Crypto 2025', 'Guide complet investissement crypto 2025', 12, 'digital', 1);

    insertProd.run(packs, 'Pack Starter', 'T-Shirt + Ebook Crypto 2025 + Preset Pack', 79, 'digital', 1);
    insertProd.run(packs, 'Pack Premium', 'Hoodie + Formation DeFi Pro + Pack NFT Avancé', 199, 'digital', 1);

    db.exec('COMMIT');
    console.log('[DB] Demo data inserted');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { db, setupDatabase };
