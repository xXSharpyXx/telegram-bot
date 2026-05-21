const { verifyWebhookSignature, mapPaymentStatus } = require('../../utils/nowpayments');
const {
  getOrderByNowpaymentsId, updateOrderStatusByNowpaymentsId,
  getOrderById, creditWallet, addTransaction, getUserByTelegramId,
} = require('../../database/queries');
const { formatEur } = require('../../utils/formatter');

async function handleNowpaymentsWebhook(req, res, bot) {
  const sig = req.headers['x-nowpayments-sig'];
  const body = req.body;

  // Verify HMAC signature
  if (!verifyWebhookSignature(body, sig)) {
    console.warn('[WEBHOOK] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { payment_id, payment_status, order_id } = body;
  const internalStatus = mapPaymentStatus(payment_status);

  console.log(`[WEBHOOK] Payment ${payment_id} → ${payment_status} (→${internalStatus}) for order ${order_id}`);

  // Find order by nowpayments_id or order_id
  let order = getOrderByNowpaymentsId(String(payment_id));
  if (!order) order = getOrderById(parseInt(order_id));
  if (!order) {
    console.warn(`[WEBHOOK] Order not found: payment_id=${payment_id}, order_id=${order_id}`);
    return res.status(200).json({ ok: true }); // ack anyway
  }

  // Avoid re-processing already paid orders
  if (order.status === 'paid' && internalStatus !== 'refunded') {
    return res.status(200).json({ ok: true });
  }

  updateOrderStatusByNowpaymentsId(String(payment_id), internalStatus);

  if (internalStatus === 'paid') {
    const fullOrder = getOrderById(order.id);

    // If recharge → credit wallet
    if (fullOrder?.order_type === 'recharge') {
      creditWallet(fullOrder.telegram_id, fullOrder.total_eur);
      addTransaction({
        user_id: fullOrder.user_id,
        type: 'credit',
        amount_eur: fullOrder.total_eur,
        description: `Recharge wallet via ${fullOrder.crypto}`,
        order_id: fullOrder.id,
      });
    } else {
      // Regular purchase debit
      addTransaction({
        user_id: fullOrder.user_id,
        type: 'debit',
        amount_eur: fullOrder.total_eur,
        description: `Commande #${fullOrder.id}`,
        order_id: fullOrder.id,
      });
    }

    // Notify user on Telegram
    try {
      const user = getUserByTelegramId(fullOrder.telegram_id);
      if (user && bot) {
        const msg = fullOrder.order_type === 'recharge'
          ? `✅ *Paiement confirmé\\!*\n\n💰 Votre wallet a été crédité de *${formatEur(fullOrder.total_eur)}*\\.`
          : `✅ *Commande \\#${fullOrder.id} confirmée\\!*\n\n💰 Montant : *${formatEur(fullOrder.total_eur)}*\nMerci pour votre achat\\! 🎉`;
        await bot.telegram.sendMessage(fullOrder.telegram_id, msg, { parse_mode: 'MarkdownV2' });
      }
    } catch (err) {
      console.error('[WEBHOOK] Telegram notify error:', err.message);
    }
  }

  res.status(200).json({ ok: true });
}

module.exports = { handleNowpaymentsWebhook };
