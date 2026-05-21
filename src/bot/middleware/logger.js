function logger(ctx, next) {
  const user = ctx.from;
  const text = ctx.message?.text || ctx.callbackQuery?.data || '[non-text]';
  console.log(`[BOT] ${new Date().toISOString()} | user=${user?.id} | msg=${text}`);
  return next();
}

module.exports = { logger };
