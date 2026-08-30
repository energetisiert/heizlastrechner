import { initBotId } from 'botid/client/core';

// Vercel BotID: Diese Pfade werden clientseitig instrumentiert, damit
// checkBotId() in den Route-Handlern das Verdikt serverseitig prüfen kann.
initBotId({
  protect: [
    { path: '/api/heizlast/berechnen', method: 'POST' },
    { path: '/api/heizlast/anfrage', method: 'POST' },
  ],
});
