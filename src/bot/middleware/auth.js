function isAdmin(ctx) {
  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  return adminIds.includes(String(ctx.from?.id));
}

function requireAdmin(ctx, next) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Accès refusé. Commande réservée aux administrateurs.');
  }
  return next();
}

module.exports = { isAdmin, requireAdmin };
