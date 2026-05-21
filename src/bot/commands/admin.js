const fs = require('fs');
const path = require('path');
const {
  getStats, getAllProducts, getProductById, addProduct,
  updateProductPrice, setProductActive, deleteProduct,
  getOrdersByStatus, getOrderById, getOrderItems,
  updateOrderStatus, addTransaction, creditWallet,
  getUserByTelegramId, getAllUsers, exportAllData,
} = require('../../database/queries');
const { formatStats, formatOrder, formatProduct, formatUser, formatEur } = require('../../utils/formatter');

async function handleAdmin(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const sub = args[0]?.toLowerCase();

  // ── /admin (dashboard) ──────────────────────────────────────────────────
  if (!sub) {
    const stats = getStats();
    return ctx.replyWithMarkdown(formatStats(stats));
  }

  // ── /admin produits ──────────────────────────────────────────────────────
  if (sub === 'produits') {
    const products = getAllProducts();
    if (!products.length) return ctx.reply('Aucun produit en base.');
    const lines = products.map(p =>
      `${p.active ? '🟢' : '🔴'} #${p.id} ${p.category_emoji || ''} ${p.name} — ${formatEur(p.price)}`
    ).join('\n');
    return ctx.reply(`📦 *Produits (${products.length})*\n──────────\n${lines}`, { parse_mode: 'Markdown' });
  }

  // ── /admin ajouter <nom> | <desc> | <prix> | <poids> ────────────────────
  if (sub === 'ajouter') {
    const rest = args.slice(1).join(' ');
    const parts = rest.split('|').map(s => s.trim());
    if (parts.length < 4) {
      return ctx.reply('Usage: /admin ajouter <nom> | <description> | <prix> | <poids_ou_digital>');
    }
    const [name, description, priceStr, weight] = parts;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return ctx.reply('Prix invalide.');
    const is_digital = weight?.toLowerCase() === 'digital' ? 1 : 0;
    addProduct({ category_id: 1, name, description, price, weight, is_digital });
    return ctx.reply(`✅ Produit "${name}" ajouté à ${formatEur(price)}.`);
  }

  // ── /admin modifier <id> prix <valeur> ──────────────────────────────────
  if (sub === 'modifier') {
    const id = parseInt(args[1]);
    const field = args[2]?.toLowerCase();
    const value = args[3];
    if (!id || field !== 'prix' || !value) {
      return ctx.reply('Usage: /admin modifier <id> prix <valeur>');
    }
    const price = parseFloat(value);
    if (isNaN(price)) return ctx.reply('Prix invalide.');
    const result = updateProductPrice(id, price);
    if (!result.changes) return ctx.reply(`Produit #${id} introuvable.`);
    return ctx.reply(`✅ Produit #${id} → nouveau prix : ${formatEur(price)}`);
  }

  // ── /admin activer <id> / desactiver <id> ───────────────────────────────
  if (sub === 'activer' || sub === 'desactiver') {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply('Usage: /admin activer <id>');
    const active = sub === 'activer' ? 1 : 0;
    setProductActive(id, active);
    return ctx.reply(`${active ? '✅ Activé' : '🔴 Désactivé'} : produit #${id}`);
  }

  // ── /admin supprimer <id> ────────────────────────────────────────────────
  if (sub === 'supprimer') {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply('Usage: /admin supprimer <id>');
    deleteProduct(id);
    return ctx.reply(`🗑 Produit #${id} supprimé.`);
  }

  // ── /admin commandes [pending|paid|all] ──────────────────────────────────
  if (sub === 'commandes') {
    const status = args[1] || 'pending';
    const orders = getOrdersByStatus(status);
    if (!orders.length) return ctx.reply(`Aucune commande avec le statut "${status}".`);
    const lines = orders.slice(0, 20).map(o =>
      `#${o.id} ${o.first_name || '?'} — ${formatEur(o.total_eur)} [${o.status}]`
    ).join('\n');
    return ctx.reply(`📦 *Commandes (${status})*\n──────────\n${lines}`, { parse_mode: 'Markdown' });
  }

  // ── /admin commande <id> ─────────────────────────────────────────────────
  if (sub === 'commande') {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply('Usage: /admin commande <id>');
    const order = getOrderById(id);
    if (!order) return ctx.reply(`Commande #${id} introuvable.`);
    const items = getOrderItems(id);
    return ctx.replyWithMarkdown(formatOrder(order, items));
  }

  // ── /admin valider <id> ──────────────────────────────────────────────────
  if (sub === 'valider') {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply('Usage: /admin valider <id>');
    updateOrderStatus(id, 'paid');
    const order = getOrderById(id);
    if (!order) return ctx.reply(`Commande #${id} introuvable.`);
    return ctx.reply(`✅ Commande #${id} marquée comme payée.`);
  }

  // ── /admin rembourser <id> ───────────────────────────────────────────────
  if (sub === 'rembourser') {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply('Usage: /admin rembourser <id>');
    updateOrderStatus(id, 'refunded');
    return ctx.reply(`🔄 Commande #${id} remboursée.`);
  }

  // ── /admin utilisateurs ──────────────────────────────────────────────────
  if (sub === 'utilisateurs') {
    const users = getAllUsers();
    if (!users.length) return ctx.reply('Aucun utilisateur enregistré.');
    const lines = users.slice(0, 20).map(u =>
      `👤 ${u.first_name || u.username || '?'} (${u.telegram_id}) — 💰 ${formatEur(u.wallet_balance)}`
    ).join('\n');
    return ctx.reply(`👥 *Utilisateurs (${users.length})*\n──────────\n${lines}`, { parse_mode: 'Markdown' });
  }

  // ── /admin utilisateur <telegram_id> ─────────────────────────────────────
  if (sub === 'utilisateur') {
    const tid = args[1];
    if (!tid) return ctx.reply('Usage: /admin utilisateur <telegram_id>');
    const user = getUserByTelegramId(tid);
    if (!user) return ctx.reply(`Utilisateur ${tid} introuvable.`);
    return ctx.replyWithMarkdown(formatUser(user));
  }

  // ── /admin crediter <telegram_id> <montant> ──────────────────────────────
  if (sub === 'crediter') {
    const tid = args[1];
    const amount = parseFloat(args[2]);
    if (!tid || isNaN(amount)) return ctx.reply('Usage: /admin crediter <telegram_id> <montant>');
    const user = getUserByTelegramId(tid);
    if (!user) return ctx.reply(`Utilisateur ${tid} introuvable.`);
    creditWallet(tid, amount);
    addTransaction({
      user_id: user.id,
      type: 'credit',
      amount_eur: amount,
      description: `Crédit manuel par admin`,
    });
    try {
      await ctx.telegram.sendMessage(tid,
        `💰 *Votre compte a été crédité de ${formatEur(amount)}*\n_Crédité par l'administration._`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}
    return ctx.reply(`✅ ${formatEur(amount)} crédités à l'utilisateur ${tid}.`);
  }

  // ── /admin export ────────────────────────────────────────────────────────
  if (sub === 'export') {
    const data = exportAllData();
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(__dirname, '../../../data', `export_${date}.csv`);

    const headers = 'order_id,telegram_id,first_name,username,total_eur,crypto,crypto_amount,status,order_type,created_at,paid_at\n';
    const rows = data.map(r =>
      [r.order_id, r.telegram_id, r.first_name, r.username, r.total_eur,
       r.crypto, r.crypto_amount, r.status, r.order_type, r.created_at, r.paid_at]
        .map(v => `"${v ?? ''}"`)
        .join(',')
    ).join('\n');

    fs.writeFileSync(filePath, headers + rows, 'utf-8');

    await ctx.replyWithDocument({ source: filePath, filename: `export_${date}.csv` });
    return;
  }

  return ctx.reply(`❓ Sous-commande inconnue. Tapez /admin pour le dashboard.`);
}

async function handleSolde(ctx) {
  const user = getUserByTelegramId(String(ctx.from.id));
  if (!user) return ctx.reply('Compte introuvable. Tapez /start pour vous inscrire.');
  return ctx.replyWithMarkdown(
    `💰 *Votre solde VaultStore*\n──────────────────\n💵 Solde disponible : *${formatEur(user.wallet_balance)}*`
  );
}

module.exports = { handleAdmin, handleSolde };
