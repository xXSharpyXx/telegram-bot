const express = require('express');
const router = express.Router();
const {
  getUserByTelegramId, upsertUser,
  getCategories, getProductsByCategory, getProductById,
  createOrder, updateOrderPayment, addOrderItem, getOrderById,
  getTransactionsByTelegramId, addTransaction,
} = require('../database/queries');
const { createPayment } = require('../utils/nowpayments');
const { handleNowpaymentsWebhook } = require('../bot/webhooks/nowpayments');

// ── GET /api/user/:telegram_id ────────────────────────────────────────────────
router.get('/user/:telegram_id', (req, res) => {
  const user = getUserByTelegramId(req.params.telegram_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── GET /api/categories ───────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.json(getCategories());
});

// ── GET /api/products/:category_id ───────────────────────────────────────────
router.get('/products/:category_id', (req, res) => {
  res.json(getProductsByCategory(req.params.category_id));
});

// ── GET /api/transactions/:telegram_id ───────────────────────────────────────
router.get('/transactions/:telegram_id', (req, res) => {
  res.json(getTransactionsByTelegramId(req.params.telegram_id));
});

// ── GET /api/order/:order_id ──────────────────────────────────────────────────
router.get('/order/:order_id', (req, res) => {
  const order = getOrderById(req.params.order_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ── POST /api/order ───────────────────────────────────────────────────────────
router.post('/order', async (req, res) => {
  const { telegram_id, items, crypto, order_type } = req.body;

  if (!telegram_id || !crypto) {
    return res.status(400).json({ error: 'telegram_id and crypto are required' });
  }

  // Ensure user exists
  let user = getUserByTelegramId(String(telegram_id));
  if (!user) {
    upsertUser({ telegram_id: String(telegram_id), username: null, first_name: null });
    user = getUserByTelegramId(String(telegram_id));
  }

  let total_eur = 0;

  if (order_type === 'recharge') {
    // For recharges, items should be [{ amount }]
    if (!items || !items[0]?.amount) return res.status(400).json({ error: 'amount required for recharge' });
    total_eur = parseFloat(items[0].amount);
  } else {
    if (!items || !items.length) return res.status(400).json({ error: 'items required' });
    for (const item of items) {
      const product = getProductById(item.product_id);
      if (!product || !product.active) {
        return res.status(400).json({ error: `Product ${item.product_id} not found or inactive` });
      }
      total_eur += product.price * (item.quantity || 1);
    }
  }

  if (total_eur <= 0) return res.status(400).json({ error: 'Invalid total' });

  // Create order in DB
  const orderResult = createOrder({
    user_id: user.id,
    total_eur,
    crypto,
    order_type: order_type || 'purchase',
  });
  const order_id = orderResult.lastInsertRowid;

  // Add order items (for regular purchases)
  if (order_type !== 'recharge') {
    for (const item of items) {
      const product = getProductById(item.product_id);
      addOrderItem({
        order_id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        price_eur: product.price,
      });
    }
  }

  // Call NOWPayments
  const ipnUrl = `${process.env.WEB_APP_URL}/api/webhook/nowpayments`;
  try {
    const payment = await createPayment({
      price_amount: total_eur,
      pay_currency: crypto,
      order_id,
      ipn_callback_url: ipnUrl,
    });

    updateOrderPayment(order_id, {
      nowpayments_id: String(payment.payment_id),
      wallet_address: payment.pay_address,
      crypto_amount: payment.pay_amount,
    });

    return res.json({
      order_id,
      wallet_address: payment.pay_address,
      amount_crypto: payment.pay_amount,
      crypto: payment.pay_currency?.toUpperCase() || crypto,
      total_eur,
      payment_id: payment.payment_id,
    });
  } catch (err) {
    console.error('[API] NOWPayments error:', err.response?.data || err.message);
    // Return order_id without payment info so frontend can show error
    return res.status(502).json({
      error: 'Payment gateway error',
      details: err.response?.data?.message || err.message,
      order_id,
    });
  }
});

// ── POST /api/webhook/nowpayments ─────────────────────────────────────────────
// bot instance is attached later in index.js
router.post('/webhook/nowpayments', (req, res) => {
  const bot = req.app.get('bot');
  return handleNowpaymentsWebhook(req, res, bot);
});

module.exports = router;
