# MedID – real SOS notifications
## Run
1. Install Node.js 18+ and open this folder in VS Code.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in ONE channel (below).
4. `npm start` then open http://localhost:3000
## Channels
- **Telegram (recommended for the review):** In Telegram chat with @BotFather send /newbot, copy the token to TELEGRAM_BOT_TOKEN. Each contact opens your bot and presses Start. Get their chat id by opening https://api.telegram.org/bot<TOKEN>/getUpdates after they message the bot; put ids in TELEGRAM_CHAT_IDS.
- **ntfy push:** pick a hard-to-guess topic name in NTFY_TOPIC; install the ntfy app on the phones and subscribe to it. Anyone who knows the topic can read alerts.
- **SMS (Twilio):** trial accounts only text numbers you verified in the Twilio console.
## Limitations (say these in your review)
No login yet; anyone who can reach the server can trigger alerts. Telegram/ntfy/SMS show delivery to the provider, not that a person read it. Location is only included if the browser grants it (needs localhost or HTTPS). Not a replacement for calling 112.
