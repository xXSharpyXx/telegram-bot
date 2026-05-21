const { upsertUser } = require('../../database/queries');

async function handleStart(ctx) {
  const { id, username, first_name } = ctx.from;

  upsertUser({ telegram_id: String(id), username, first_name });

  const webAppUrl = process.env.WEB_APP_URL || 'https://ton-app.railway.app';
  const name = first_name || 'ami';

  await ctx.replyWithMarkdownV2(
    `👋 *Bienvenue ${name} sur VaultStore\\!*\n\n` +
    `🛍 Découvrez notre boutique : merch, formations et produits digitaux\\.\n\n` +
    `💰 Paiement 100% crypto \\(BTC, ETH, USDT, SOL\\.\\.\\.\\)\n` +
    `🔐 Sécurisé via NOWPayments\n\n` +
    `👇 Ouvrez la boutique ci\\-dessous :`,
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🛍 Ouvrir la boutique',
            web_app: { url: webAppUrl },
          },
        ]],
      },
    }
  );
}

module.exports = { handleStart };
