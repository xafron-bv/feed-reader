/* global self */
const FEED_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let timer = null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
  schedule();
});

function schedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    tick();
  }, FEED_REFRESH_INTERVAL_MS);
}

async function tick() {
  // Broadcast a message to all clients to trigger refresh in foreground context
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'FEEDS_REFRESH_TICK' });
  }
}