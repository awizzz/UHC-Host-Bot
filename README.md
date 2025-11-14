# UHC HOSTS — bot Discord par Awizz

UHC HOSTS est un bot Discord en Node.js (ES Modules) qui automatise les annonces d'événements façon « host » avec inscriptions, tirages au sort et rappels programmés. Le bot repose sur `discord.js` v14, SQLite pour la persistance, Luxon pour la gestion des dates et `node-schedule` pour la planification.

## 🚀 Fonctionnalités principales
- Publication d'annonce riche avec embed, boutons (✅/❌/📋/🎲) et option de ping `@everyone`.
- Commandes slash complètes pour créer, éditer, annuler, lister, tirer au sort et forcer l'ouverture des admissions.
- Gestion des participants (file d'attente, anti-duplicat, quotas).
- Planification automatique : ouverture des admissions, rappel configurable et tirage automatique à l'heure de l'événement.
- Logs modération vers un salon dédié et DM aux gagnants/rappels.
- Persistance SQLite (aucune perte de données au redémarrage).
- Localisation FR/EN pour les dates (Luxon).
- Support multi-serveurs : les événements sont isolés par serveur Discord, un seul bot peut gérer plusieurs communautés.
- Commande `/config` pour ajuster fuseau horaire, langue, rappels, salon de logs et comportement de mention.

## 📦 Prérequis
- Node.js >= 18.17
- npm >= 9
- Un bot Discord créé avec les intents **Guilds**, **GuildMembers**, **DirectMessages** autorisés.
- Permissions recommandées pour le bot : `Send Messages`, `Embed Links`, `Use Application Commands`, `Mention Everyone` (si nécessaire), `Manage Messages` (facultatif pour maintenir la lisibilité).

## 🛠️ Installation
```bash
git clone <repo> UHC-HOSTS
cd UHC-HOSTS
npm install
```

## ⚙️ Configuration
1. Dupliquez `.env.example` vers `.env`.
2. Renseignez les valeurs :
   - `DISCORD_TOKEN` : jeton du bot.
   - `CLIENT_ID` : ID de l'application.
   - `GUILD_ID` (optionnel) : ID d'un serveur pour enregistrer les commandes en mode développement.
   - `DATABASE_PATH` : chemin SQLite (défaut `./data/uhc-hosts.db`).
   - `DEFAULT_TIMEZONE`, `DEFAULT_LOCALE` et `DEFAULT_REMINDER_MINUTES`.
   - `LOG_CHANNEL_ID` : ID du salon qui recevra les logs modération.
   - Lors de la création d'un événement, saisissez `date` sous la forme `YYYY-MM-DD` et `time` sous la forme `HH:mm` (ou `HH:mm:ss`). Le fuseau appliqué est `DEFAULT_TIMEZONE`.

3. Enregistrez les commandes slash :
```bash
npm run register
```

4. Lancez le bot :
```bash
npm start
```

> Pour un déploiement permanent, utilisez `pm2`, `systemd` ou un conteneur Docker (non fourni).

5. Ajustez les paramètres propres à chaque serveur avec `/config set` (`/config show` pour vérifier).

## 🔐 Intents et permissions Discord
- Activer dans le portail développeur : **Server Members Intent** + **Message Content (optionnel)** si vous envisagez d'ajouter des fonctionnalités supplémentaires.
- Donner au bot les permissions suivantes sur le serveur : `Send Messages`, `Use Application Commands`, `Embed Links`, `Manage Messages` (optionnel), `Mention Everyone` si vous souhaitez autoriser le ping massif.

## 📝 Commandes Slash
| Commande | Description |
|----------|-------------|
| `/createevent title slots date time link description admission_offset? mention_everyone? reminder_minutes?` | Crée un événement et publie l'annonce. |
| `/editevent eventid` | Ouvre un flux interactif pour modifier un champ (titre, description, date, etc.). |
| `/cancelevent eventid` | Annule un événement et désactive les interactions. |
| `/listevents` | Liste les événements actifs à venir. |
| `/draw eventid winners` | Lance un tirage manuel avec le nombre de gagnants désiré. |
| `/forceadmit eventid` | Ouvre immédiatement les admissions (gestionnaire uniquement). |
| `/config show` / `/config set …` | Afficher ou modifier la configuration serveur du bot. |

## 🎮 Interactions utilisateur
- **✅ Rejoindre** : les inscriptions sont enregistrées et persistent.
- **❌ Quitter** : retire le joueur et renumérote la file d'attente.
- **📋 Liste** : affiche la liste des participants (embed éphémère).
- **🎲 Tirage** : bouton réservé au créateur/gestionnaires, déclenche une modale pour choisir le nombre de gagnants.

## ⏰ Planification automatique
- **Ouverture admissions** : à `start - admission_offset`.
- **Rappel** : DM + message salon à `start - reminder_minutes`.
- **Tirage automatique** : à `start`, sélectionne les gagnants (slots) et notifie.

Toutes les programmations sont restaurées au redémarrage.

## 🗂️ Structure du projet
```
src/
├─ commands/             # Commandes slash
├─ events/               # Écouteurs Discord (interaction, ready)
├─ interactions/         # Boutons, menus, modales
├─ scheduler/            # Gestion des tâches planifiées
├─ services/             # Logique métier (eventManager)
├─ utils/                # Aides (temps, permissions, embeds)
├─ config.js             # Chargement .env & paramètres globaux
├─ database.js           # Accès SQLite
├─ index.js              # Point d'entrée du bot
└─ registerCommands.js   # Script d’enregistrement des slash commands
tests/
└─ runTests.js           # Tests utilitaires (Luxon)
```

## 🧪 Tests
Lancez le script de validation :
```bash
npm test
```

## 📜 Logs
Chaque interaction clé (création, inscription, tirage, etc.) est consignée dans la base. Si `LOG_CHANNEL_ID` est défini, les logs sont envoyés dans ce salon, sinon ils retombent dans le salon d'annonce de l'événement.

## 🔁 Déploiement continu
- Utilisez `npm run register` après chaque modification de commande.
- PM2 (fourni) :
  ```bash
  pm2 start ecosystem.config.cjs
  pm2 restart uhc-hosts    # redémarrer
  pm2 stop uhc-hosts       # arrêter
  pm2 logs uhc-hosts       # consulter les logs
  pm2 save                 # enregistrer l'état
  pm2 startup              # générer le service au reboot
  ```
  Le fichier `ecosystem.config.cjs` utilise automatiquement le dossier du projet comme `cwd`.
- Sur un serveur Linux, un service systemd minimal :
```ini
[Unit]
Description=UHC HOSTS Discord Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/UHC-HOSTS
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 🎨 Personnalisation de l'embed
- Couleur principale configurable dans `src/utils/embedFactory.js` (`BRAND_COLOR`).
- Emojis et libellés des boutons centralisés dans `eventManager`.
- Ajoutez un thumbnail ou une image dans `buildEventEmbed` si nécessaire.

---

Made with ❤️ par **Awizz**. Contributions et suggestions bienvenues !

