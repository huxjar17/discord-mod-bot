# ModControl — Full Discord Moderation Bot + Dashboard

## 📁 Project Structure

```
discord-mod-bot/
├── bot/                 ← Discord bot + REST API
│   ├── index.js         ← Main bot file
│   ├── package.json
│   ├── .env             ← Your tokens & config
│   └── data.json        ← Auto-created: warns, mod log, settings
└── dashboard/           ← React web dashboard
    ├── src/
    │   ├── pages/       ← Overview, ModLog, Warnings, AutoMod, Settings, DM
    │   ├── components/  ← Sidebar
    │   ├── App.jsx
    │   └── api.js
    └── package.json
```

---

## ⚡ SETUP — Step by Step

### 1. Create a Discord Application & Bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name (e.g. "ModControl")
3. Go to the **Bot** tab → click **Add Bot**
4. Under "Privileged Gateway Intents", enable:
   - **Presence Intent**
   - **Server Members Intent**
   - **Message Content Intent**
5. Copy your **Bot Token** (you'll need it in Step 3)
6. Go to **OAuth2 → General** and copy your **Application (Client) ID**

### 2. Invite the Bot to Your Server

Build this URL (replace CLIENT_ID with your actual ID):

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=8
```

Permission `8` = Administrator (recommended for moderation bots).
Open this URL in your browser and select your server.

### 3. Configure the Bot

Edit `bot/.env`:

```env
BOT_TOKEN=paste_your_bot_token_here
CLIENT_ID=paste_your_client_id_here
DASHBOARD_API_KEY=choose_a_strong_secret_password
API_PORT=3001
```

### 4. Install & Run the Bot

```bash
cd bot
npm install
npm start
```

You should see:
```
✅ Logged in as YourBot#1234
✅ Slash commands registered globally.
📊 Dashboard API running on port 3001
```

> **Note:** Global slash commands take up to 1 hour to appear in Discord.
> For instant testing, register guild commands instead by adding your guild ID.

### 5. Install & Run the Dashboard

In a second terminal:

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173 and log in with your `DASHBOARD_API_KEY`.

---

## 🤖 All Bot Commands

### Moderation
| Command | Description |
|---------|-------------|
| `/ban @user [reason] [delete_days] [duration]` | Ban a user. Add duration (e.g. `7d`) for temp-ban |
| `/unban <userID> [reason]` | Unban by user ID |
| `/kick @user [reason]` | Kick a user |
| `/mute @user <duration> [reason]` | Timeout a user (e.g. `10m`, `1h`, `7d`) |
| `/unmute @user [reason]` | Remove timeout |
| `/warn @user <reason>` | Warn a user (triggers auto-escalation if configured) |
| `/unwarn <warnID>` | Remove a warning by ID |
| `/history @user` | View full mod history for a user |
| `/note @user <text>` | Add a private mod note |

### Channel Management
| Command | Description |
|---------|-------------|
| `/purge <count> [@user]` | Delete up to 100 messages; optionally filter by user |
| `/slowmode <seconds>` | Set slowmode (0 = off, max 21600) |
| `/lock [reason]` | Prevent members from sending messages in the channel |
| `/unlock` | Re-open a locked channel |
| `/lockdown [reason]` | Lock ALL channels (use during raids) |

### DM & Info
| Command | Description |
|---------|-------------|
| `/dm @user <message>` | Send a DM to a user from the bot |
| `/userinfo [@user]` | View user details + warning count |
| `/serverinfo` | View server statistics |

### Configuration
| Command | Description |
|---------|-------------|
| `/setlogchannel #channel` | Set where mod actions are logged |
| `/setescalation <mute_at> <kick_at> <ban_at>` | Auto-escalate on warnings (0 = off) |
| `/automod status` | View current AutoMod settings |
| `/automod set <feature> <true/false>` | Toggle an AutoMod feature |
| `/automod badword <add/remove> <word>` | Manage bad word list |

---

## 🛡️ AutoMod Features

| Feature | What It Does |
|---------|-------------|
| Anti-Spam | Mutes users who send 5+ messages in 5 seconds |
| Bad Words Filter | Deletes messages matching your custom word list |
| Anti-Raid | Alerts mods + kicks new accounts (<7 days old) during join spikes |
| Block Invite Links | Removes Discord invite links automatically |
| Mass Mention Guard | Deletes messages that @mention 5+ users |
| Caps Lock Filter | Removes messages that are >70% uppercase |

---

## 📊 Dashboard Pages

- **Overview** — Stats cards + action breakdown chart
- **Mod Log** — Searchable, filterable action history
- **Warnings** — View and remove active warnings per user
- **AutoMod** — Toggle features, manage bad word list
- **DM Tool** — Send direct messages to users
- **Settings** — Configure log channel + auto-escalation thresholds

---

## 🔧 Production Deployment

### Bot (Node.js)
Use [PM2](https://pm2.keymetrics.io/) to keep the bot running:
```bash
npm install -g pm2
pm2 start bot/index.js --name modbot
pm2 save
pm2 startup
```

### Dashboard (Static)
```bash
cd dashboard
npm run build          # outputs to dist/
# Serve dist/ with nginx, Vercel, Netlify, etc.
```

If hosting dashboard elsewhere, update vite.config.js proxy target
to point at your bot server's public URL.

---

## 💾 Data Storage

All data is saved to `bot/data.json` automatically:
- Warnings per user per guild
- Full mod log
- AutoMod settings + bad word lists
- Escalation thresholds
- Log channel IDs

For production with multiple servers, consider migrating to SQLite
(using `better-sqlite3`) or PostgreSQL.

---

## 🔐 Security Notes

- Never share your `BOT_TOKEN` or `DASHBOARD_API_KEY`
- The dashboard API requires the key in every request header
- Rotate the key if compromised: update `.env` and restart the bot
- The bot only accepts slash commands from users with the required Discord permissions
