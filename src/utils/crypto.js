// Approximate EUR → crypto conversion for display purposes only.
// NOWPayments handles the real conversion during payment creation.
const APPROX_RATES = {
  BTC: 0.000016,
  ETH: 0.00031,
  USDT: 1.08,
  USDC: 1.08,
  SOL: 0.0085,
  LTC: 0.012,
};

function eurToCrypto(eur, currency) {
  const rate = APPROX_RATES[currency.toUpperCase()];
  if (!rate) return null;
  return (eur * rate).toFixed(currency === 'BTC' ? 8 : 6);
}

const SUPPORTED_CRYPTOS = [
  { code: 'USDT', name: 'Tether (USDT)', emoji: '💵' },
  { code: 'BTC',  name: 'Bitcoin (BTC)',  emoji: '₿'  },
  { code: 'ETH',  name: 'Ethereum (ETH)', emoji: '⟠'  },
  { code: 'SOL',  name: 'Solana (SOL)',   emoji: '◎'  },
  { code: 'LTC',  name: 'Litecoin (LTC)', emoji: 'Ł'  },
  { code: 'USDC', name: 'USD Coin (USDC)', emoji: '🔵' },
];

module.exports = { eurToCrypto, SUPPORTED_CRYPTOS };
