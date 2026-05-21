require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Telegraf } = require('telegraf');

const { setupDatabase } = require('./database/setup');
const { upsertUser } = require('./database/queries');
const { handleStart } = require('./bot/commands/start');
const { handleHelp } = require('./bot/commands/help');
const { handleAdmin, handleSolde } = require('./bot/commands/admin');
const { requireAdmin } = require('./bot/middleware/auth');
const { rateLimit } = require('./bot/middleware/rateLimit');
const { logger } = require('./bot/middleware/logger');
const apiRoutes = require('./api/routes');

// ── Setup DB ──────────────────────────────────────────────────────────────────
setupDatabase();

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Raw body needed for HMAC verification on webhook
app.use('/api/webhook/nowpayments', express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Telegraf Bot ──────────────────────────────────────────────────────────────
const bot = new Telegraf(process.env.BOT_TOKEN);
app.set('bot', bot);

// Global middleware
bot.use(logger);
bot.use(rateLimit);

// Auto-upsert every user on any message
bot.use((ctx, next) => {
  if (ctx.from) {
    upsertUser({
      telegram_id: String(ctx.from.id),
      username: ctx.from.username,
      first_name: ctx.from.first_name,
    });
  }
  return next();
});

// Commands
bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('solde', handleSolde);
bot.command('admin', requireAdmin, handleAdmin);

// Graceful error handling
bot.catch((err, ctx) => {
  console.error(`[BOT ERROR] ctx=${ctx.updateType}`, err);
  ctx.reply('❌ Une erreur est survenue. Réessayez plus tard.').catch(() => {});
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Launch ────────────────────────────────────────────────────────────────────
async function launch() {
  // Start Express
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
  });

  // Start bot
  if (process.env.WEB_APP_URL && process.env.WEB_APP_URL !== 'https://ton-app.railway.app') {
    // Webhook mode for production
    const webhookUrl = `${process.env.WEB_APP_URL}/telegram-webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    app.use('/telegram-webhook', (req, res) => {
      bot.handleUpdate(req.body, res);
    });
    console.log(`[BOT] Webhook set to ${webhookUrl}`);
  } else {
    // Long polling for local dev
    await bot.launch();
    console.log('[BOT] Started in long-polling mode');
  }
}

launch().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
