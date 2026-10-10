/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `btracker-cache-${version}`;

const ASSETS = [
  ...build,
  ...files
];

self.addEventListener('install', (event: any) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }
  event.waitUntil(addFilesToCache());
  // @ts-ignore
  self.skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }
  event.waitUntil(deleteOldCaches());
  // @ts-ignore
  self.clients.claim();
});

self.addEventListener('fetch', (event: any) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip Chrome extensions and api calls
  if (url.protocol.startsWith('chrome-extension') || url.pathname.startsWith('/api/')) return;

  async function respond() {
    const cache = await caches.open(CACHE);

    // Network-first for HTML pages (in case of updates that bypass SW)
    if (event.request.mode === 'navigate') {
        try {
            const response = await fetch(event.request);
            if (response.ok) {
                cache.put(event.request, response.clone());
            }
            return response;
        } catch {
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
            // Fallback to offline page or root if needed
            const rootResponse = await cache.match('/');
            if (rootResponse) return rootResponse;
        }
    }

    // Cache-first for build assets and static files
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) return cachedResponse;

    try {
      const response = await fetch(event.request);
      if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return new Response('Offline', { status: 404 });
    }
  }

  event.respondWith(respond());
});
