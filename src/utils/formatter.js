function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function formatEur(amount) {
  return `${Number(amount).toFixed(2)} €`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

function formatStats(stats) {
  return `📊 *Dashboard VaultStore*
──────────────────
👥 Utilisateurs : ${stats.total_users}
📦 Commandes totales : ${stats.total_orders}
✅ Payées : ${stats.paid_orders}
⏳ En attente : ${stats.pending_orders}
❌ Échouées : ${stats.failed_orders}
──────────────────
💰 Revenus totaux : *${formatEur(stats.total_revenue)}*
📅 Aujourd'hui : *${formatEur(stats.today_revenue)}*`;
}

function formatOrder(order, items) {
  const itemLines = items.map(i => `  • ${i.name} x${i.quantity} — ${formatEur(i.price_eur * i.quantity)}`).join('\n');
  const statusEmoji = { pending: '⏳', paid: '✅', failed: '❌', refunded: '🔄' };
  return `🧾 *Commande #${order.id}*
──────────────────
👤 Client : ${escapeMarkdown(order.first_name)} (${order.telegram_id})
📋 Articles :
${itemLines}
──────────────────
💰 Total : *${formatEur(order.total_eur)}*
🪙 Crypto : ${order.crypto || 'N/A'}
${statusEmoji[order.status] || '❓'} Statut : *${order.status}*
📅 Créé : ${formatDate(order.created_at)}
${order.paid_at ? `✅ Payé : ${formatDate(order.paid_at)}` : ''}`;
}

function formatProduct(product) {
  const typeIcon = product.is_digital ? '💾' : '📦';
  return `${typeIcon} *${escapeMarkdown(product.name)}* \\(#${product.id}\\)
💰 Prix : ${formatEur(product.price)}
⚖️ Poids : ${product.weight || 'N/A'}
🟢 Actif : ${product.active ? 'Oui' : 'Non'}`;
}

function formatUser(user) {
  return `👤 *${escapeMarkdown(user.first_name || 'Inconnu')}*
🆔 Telegram ID : \`${user.telegram_id}\`
👛 Solde : *${formatEur(user.wallet_balance)}*
📅 Inscrit : ${formatDate(user.created_at)}
🕐 Dernier accès : ${formatDate(user.last_seen)}`;
}

module.exports = { escapeMarkdown, formatEur, formatDate, formatStats, formatOrder, formatProduct, formatUser };
