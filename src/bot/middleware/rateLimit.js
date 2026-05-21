const userTimestamps = new Map();
const WINDOW_MS = 10_000;
const MAX_REQUESTS = 5;

function rateLimit(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const timestamps = (userTimestamps.get(userId) || []).filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return ctx.reply('⏱ Trop de requêtes. Patientez quelques secondes.');
  }

  timestamps.push(now);
  userTimestamps.set(userId, timestamps);
  return next();
}

module.exports = { rateLimit };
