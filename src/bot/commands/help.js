async function handleHelp(ctx) {
  await ctx.replyWithMarkdownV2(
    `📖 *Aide VaultStore*\n` +
    `──────────────────\n\n` +
    `*Commandes disponibles :*\n` +
    `/start — Ouvrir la boutique\n` +
    `/help — Afficher cette aide\n` +
    `/solde — Voir votre solde wallet\n\n` +
    `*Comment acheter ?*\n` +
    `1\\. Ouvrez la boutique via /start\n` +
    `2\\. Parcourez les catégories\n` +
    `3\\. Ajoutez des articles au panier\n` +
    `4\\. Choisissez votre crypto\n` +
    `5\\. Payez à l'adresse générée\n\n` +
    `*Support :* Utilisez l'onglet 💬 Support dans l'app\\.`
  );
}

module.exports = { handleHelp };
