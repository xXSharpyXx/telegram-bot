// node:sqlite returns BigInt for lastInsertRowid — always wrap with Number()
const { db } = require('./setup');

// ─── USERS ───────────────────────────────────────────────────────────────────

function upsertUser({ telegram_id, username, first_name }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_seen = excluded.last_seen
  `).run(telegram_id, username || null, first_name || null, now);
  return getUserByTelegramId(telegram_id);
}

function getUserByTelegramId(telegram_id) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegram_id));
}

function getAllUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

function creditWallet(telegram_id, amount) {
  db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE telegram_id = ?')
    .run(amount, String(telegram_id));
}

function debitWallet(telegram_id, amount) {
  db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE telegram_id = ?')
    .run(amount, String(telegram_id));
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

function getCategories() {
  return db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
}

function getCategoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

function getProductsByCategory(category_id) {
  return db.prepare('SELECT * FROM products WHERE category_id = ? AND active = 1').all(category_id);
}

function getProductById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function getAllProducts() {
  return db.prepare(`
    SELECT p.*, c.name as category_name, c.emoji as category_emoji
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY c.sort_order, p.id
  `).all();
}

function addProduct({ category_id, name, description, price, weight, is_digital }) {
  const result = db.prepare(`
    INSERT INTO products (category_id, name, description, price, weight, is_digital)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(category_id, name, description || '', price, weight || '', is_digital || 0);
  return { lastInsertRowid: Number(result.lastInsertRowid) };
}

function updateProductPrice(id, price) {
  return db.prepare('UPDATE products SET price = ? WHERE id = ?').run(price, id);
}

function setProductActive(id, active) {
  return db.prepare('UPDATE products SET active = ? WHERE id = ?').run(active, id);
}

function deleteProduct(id) {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

function createOrder({ user_id, total_eur, crypto, order_type }) {
  const result = db.prepare(`
    INSERT INTO orders (user_id, total_eur, crypto, order_type)
    VALUES (?, ?, ?, ?)
  `).run(user_id, total_eur, crypto, order_type || 'purchase');
  return { lastInsertRowid: Number(result.lastInsertRowid) };
}

function updateOrderPayment(order_id, { nowpayments_id, wallet_address, crypto_amount }) {
  return db.prepare(`
    UPDATE orders SET nowpayments_id = ?, wallet_address = ?, crypto_amount = ?
    WHERE id = ?
  `).run(nowpayments_id, wallet_address, crypto_amount, order_id);
}

function updateOrderStatus(order_id, status) {
  const now = status === 'paid' ? new Date().toISOString() : null;
  return db.prepare('UPDATE orders SET status = ?, paid_at = ? WHERE id = ?')
    .run(status, now, order_id);
}

function updateOrderStatusByNowpaymentsId(nowpayments_id, status) {
  const now = status === 'paid' ? new Date().toISOString() : null;
  return db.prepare('UPDATE orders SET status = ?, paid_at = ? WHERE nowpayments_id = ?')
    .run(status, now, String(nowpayments_id));
}

function getOrderById(id) {
  return db.prepare(`
    SELECT o.*, u.telegram_id, u.first_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(id);
}

function getOrderByNowpaymentsId(nowpayments_id) {
  return db.prepare('SELECT * FROM orders WHERE nowpayments_id = ?').get(String(nowpayments_id));
}

function getOrdersByStatus(status) {
  if (status === 'all') {
    return db.prepare(`
      SELECT o.*, u.first_name, u.username
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 50
    `).all();
  }
  return db.prepare(`
    SELECT o.*, u.first_name, u.username
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.status = ?
    ORDER BY o.created_at DESC LIMIT 50
  `).all(status);
}

// ─── ORDER ITEMS ─────────────────────────────────────────────────────────────

function addOrderItem({ order_id, product_id, quantity, price_eur }) {
  return db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, price_eur)
    VALUES (?, ?, ?, ?)
  `).run(order_id, product_id, quantity, price_eur);
}

function getOrderItems(order_id) {
  return db.prepare(`
    SELECT oi.*, p.name, p.weight, p.is_digital
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order_id);
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

function addTransaction({ user_id, type, amount_eur, description, order_id }) {
  return db.prepare(`
    INSERT INTO transactions (user_id, type, amount_eur, description, order_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(user_id, type, amount_eur, description, order_id || null);
}

function getTransactionsByTelegramId(telegram_id) {
  const user = getUserByTelegramId(telegram_id);
  if (!user) return [];
  return db.prepare(`
    SELECT * FROM transactions WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(user.id);
}

// ─── STATS ───────────────────────────────────────────────────────────────────

function getStats() {
  const today = new Date().toISOString().split('T')[0];
  return {
    total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    total_orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    paid_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'paid'").get().c,
    pending_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c,
    failed_orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'failed'").get().c,
    total_revenue: db.prepare("SELECT COALESCE(SUM(total_eur),0) as s FROM orders WHERE status = 'paid'").get().s,
    today_revenue: db.prepare(`SELECT COALESCE(SUM(total_eur),0) as s FROM orders WHERE status = 'paid' AND DATE(paid_at) = ?`).get(today).s,
  };
}

function exportAllData() {
  return db.prepare(`
    SELECT
      o.id as order_id,
      u.telegram_id,
      u.first_name,
      u.username,
      o.total_eur,
      o.crypto,
      o.crypto_amount,
      o.status,
      o.order_type,
      o.created_at,
      o.paid_at
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
}

module.exports = {
  upsertUser, getUserByTelegramId, getAllUsers, creditWallet, debitWallet,
  getCategories, getCategoryById,
  getProductsByCategory, getProductById, getAllProducts, addProduct,
  updateProductPrice, setProductActive, deleteProduct,
  createOrder, updateOrderPayment, updateOrderStatus, updateOrderStatusByNowpaymentsId,
  getOrderById, getOrderByNowpaymentsId, getOrdersByStatus,
  addOrderItem, getOrderItems,
  addTransaction, getTransactionsByTelegramId,
  getStats, exportAllData,
};
