# UHC HOSTS — bot Discord par Awizz

UHC HOSTS est un bot Discord en Node.js (ES Modules) qui permet de faire des annonces de hosts avec inscriptions, tirages au sort et rappels programmés. Le bot repose sur `discord.js` v14, SQLite pour la persistance, Luxon pour la gestion des dates et `node-schedule` pour la planification.

## 🚀 Fonctionnalités principales
- Publication d'annonce avec embed, boutons (✅/❌/📋/🎲) et option de ping `@everyone`.
- Commandes slash complètes pour créer, éditer, annuler, lister, tirer au sort et forcer l'ouverture des admissions.
- Gestion des participants (file d'attente, anti-duplicat, quotas).
- Planification automatique : ouverture des admissions, rappel configurable et tirage automatique à l'heure de l'événement.
- Logs modération vers un salon dédié et DM aux gagnants/rappels.
- Persistance SQLite (aucune perte de données au redémarrage).
- Localisation FR/EN pour les dates (Luxon).
- Commande `/config` pour ajuster fuseau horaire, langue, rappels, salon de logs et comportement de mention.

5. Ajustez les paramètres propres à chaque serveur avec `/config set` (`/config show` pour vérifier).

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

---

Made with ❤️ par **Awizz**.

