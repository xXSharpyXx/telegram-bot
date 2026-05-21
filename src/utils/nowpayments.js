const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://api.nowpayments.io/v1';

function getHeaders() {
  return {
    'x-api-key': process.env.NOWPAYMENTS_API_KEY,
    'Content-Type': 'application/json',
  };
}

async function createPayment({ price_amount, pay_currency, order_id, ipn_callback_url }) {
  const response = await axios.post(
    `${BASE_URL}/payment`,
    {
      price_amount,
      price_currency: 'EUR',
      pay_currency: pay_currency.toLowerCase(),
      order_id: String(order_id),
      ipn_callback_url,
      order_description: `VaultStore Order #${order_id}`,
    },
    { headers: getHeaders() }
  );
  return response.data;
}

async function getPaymentStatus(payment_id) {
  const response = await axios.get(
    `${BASE_URL}/payment/${payment_id}`,
    { headers: getHeaders() }
  );
  return response.data;
}

async function getSupportedCurrencies() {
  const response = await axios.get(`${BASE_URL}/currencies`, { headers: getHeaders() });
  return response.data;
}

function verifyWebhookSignature(body, receivedSig) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return false;

  // NOWPayments sorts keys alphabetically, then HMAC-SHA512
  const sorted = sortObjectKeys(body);
  const hmac = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(sorted))
    .digest('hex');

  return hmac === receivedSig;
}

function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {});
}

// Map status from NOWPayments to our internal status
function mapPaymentStatus(nowStatus) {
  const map = {
    waiting: 'pending',
    confirming: 'pending',
    confirmed: 'paid',
    sending: 'paid',
    partially_paid: 'pending',
    finished: 'paid',
    failed: 'failed',
    refunded: 'refunded',
    expired: 'failed',
  };
  return map[nowStatus] || 'pending';
}

module.exports = { createPayment, getPaymentStatus, getSupportedCurrencies, verifyWebhookSignature, mapPaymentStatus };
