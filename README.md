# VaultStore — Telegram Bot + Mini App

Bot Telegram e-commerce avec paiement crypto via NOWPayments. Interface Mini App (WebApp) intégrée directement dans Telegram.

## Stack

- **Backend** : Node.js + Telegraf.js + Express
- **Base de données** : SQLite (better-sqlite3)
- **Paiement** : NOWPayments API
- **Frontend** : HTML/CSS/JS vanilla (un seul fichier)
- **Hébergement** : Railway.app

---

## Démarrage rapide (local)

### 1. Prérequis

- Node.js >= 18
- Un bot Telegram (créez-le via [@BotFather](https://t.me/BotFather))
- Un compte [NOWPayments](https://nowpayments.io)

### 2. Installation

```bash
cd telegram-bot
npm install
```

### 3. Configuration

Copiez `.env.example` en `.env` et remplissez les valeurs :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Token fourni par @BotFather |
| `ADMIN_USER_IDS` | Vos Telegram user IDs (séparés par virgule) |
| `WEB_APP_URL` | URL publique de votre app (Railway ou ngrok en dev) |
| `NOWPAYMENTS_API_KEY` | Clé API NOWPayments |
| `NOWPAYMENTS_IPN_SECRET` | Secret IPN NOWPayments (Instant Payment Notification) |
| `PORT` | Port Express (défaut : 3000) |

### 4. Lancement

```bash
npm start
# ou en dev avec rechargement auto :
npm run dev
```

En local, le bot tourne en **long polling**. Pour la Mini App, utilisez [ngrok](https://ngrok.com) pour exposer votre port :

```bash
ngrok http 3000
# puis mettez l'URL ngrok dans WEB_APP_URL dans .env
```

---

## Déploiement Railway

### 1. Créer le projet

1. Connectez-vous sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** (ou upload direct)
3. Sélectionnez votre repo

### 2. Variables d'environnement

Dans Railway → votre service → **Variables**, ajoutez :

```
BOT_TOKEN=...
ADMIN_USER_IDS=...
WEB_APP_URL=https://VOTRE-APP.railway.app
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
PORT=3000
```

### 3. Configurer le domaine

Railway → votre service → **Settings** → **Networking** → **Generate Domain**.  
Copiez l'URL générée et mettez-la dans `WEB_APP_URL`.

### 4. Configurer BotFather

Dans [@BotFather](https://t.me/BotFather) :
1. `/mybots` → votre bot → **Bot Settings** → **Menu Button**
2. Entrez l'URL de votre app Railway
3. `/setdomain` → entrez votre domaine Railway (sans `https://`)

### 5. Configurer NOWPayments IPN

Sur [nowpayments.io](https://nowpayments.io) → **Settings** → **IPN** :
- URL : `https://VOTRE-APP.railway.app/api/webhook/nowpayments`
- Copiez la **IPN Secret Key** dans votre `.env`

---

## Commandes bot

### Utilisateurs
| Commande | Description |
|---|---|
| `/start` | Message de bienvenue + bouton Mini App |
| `/help` | Guide d'utilisation |
| `/solde` | Voir son solde wallet |

### Admins
| Commande | Description |
|---|---|
| `/admin` | Dashboard (stats globales) |
| `/admin produits` | Liste tous les produits |
| `/admin ajouter <nom> \| <desc> \| <prix> \| <poids>` | Ajouter un produit |
| `/admin modifier <id> prix <valeur>` | Modifier le prix |
| `/admin activer <id>` / `/admin desactiver <id>` | Activer/désactiver |
| `/admin supprimer <id>` | Supprimer un produit |
| `/admin commandes [pending\|paid\|all]` | Lister les commandes |
| `/admin commande <id>` | Détail d'une commande |
| `/admin valider <id>` | Marquer une commande comme payée |
| `/admin rembourser <id>` | Marquer comme remboursée |
| `/admin utilisateurs` | Liste des utilisateurs |
| `/admin utilisateur <telegram_id>` | Profil d'un utilisateur |
| `/admin crediter <telegram_id> <montant>` | Créditer un wallet |
| `/admin export` | Exporter toutes les commandes en CSV |

---

## Structure des fichiers

```
telegram-bot/
├── src/
│   ├── index.js                  ← Point d'entrée
│   ├── bot/
│   │   ├── commands/
│   │   │   ├── start.js          ← /start
│   │   │   ├── help.js           ← /help
│   │   │   └── admin.js          ← Toutes les commandes admin
│   │   ├── middleware/
│   │   │   ├── auth.js           ← Vérification admin
│   │   │   ├── rateLimit.js      ← Anti-spam
│   │   │   └── logger.js         ← Logs des messages
│   │   └── webhooks/
│   │       └── nowpayments.js    ← Callback paiements
│   ├── database/
│   │   ├── setup.js              ← Création tables + données démo
│   │   └── queries.js            ← Toutes les requêtes SQL
│   ├── api/
│   │   └── routes.js             ← Endpoints Express
│   └── utils/
│       ├── nowpayments.js        ← Wrapper API NOWPayments
│       ├── formatter.js          ← Formatage messages Telegram
│       └── crypto.js             ← Conversions EUR→crypto
├── public/
│   └── index.html                ← Mini App complète
├── data/
│   └── bot.db                    ← SQLite (créé auto)
├── .env
├── .env.example
└── package.json
```

---

## API Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/user/:telegram_id` | Profil + solde |
| GET | `/api/categories` | Catégories actives |
| GET | `/api/products/:category_id` | Produits d'une catégorie |
| GET | `/api/transactions/:telegram_id` | Historique transactions |
| POST | `/api/order` | Créer une commande + paiement |
| GET | `/api/order/:order_id` | Statut d'une commande |
| POST | `/api/webhook/nowpayments` | Callback NOWPayments |

---

## Cryptos acceptées

USDT · BTC · ETH · SOL · LTC · USDC

---

## Trouver votre Telegram User ID

Envoyez un message à [@userinfobot](https://t.me/userinfobot) — il vous renvoie votre ID à mettre dans `ADMIN_USER_IDS`.
