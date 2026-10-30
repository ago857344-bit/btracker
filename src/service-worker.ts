/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `btracker-cache-v3-${version}`;

const ASSETS = [
  ...build,
  ...files.filter((f: string) => {
    const lower = f.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm')) return false;
    if (lower.includes('/downloads/') || lower.endsWith('.zip') || lower.endsWith('install.sh')) return false;
    if (lower.includes('/landing/') || lower.startsWith('/landing/')) return false;
    return true;
  })
];

const ROUTES = [
  '/', '/log', '/plan', '/focus', '/revise', '/todo', '/tests', '/stats', '/settings'
];

self.addEventListener('install', (event: any) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    // Non-blocking precaching so a single failed static asset doesn't abort install
    await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));

    // Precache primary app shell routes concurrently
    await Promise.allSettled(
      ROUTES.map(async (route) => {
        try {
          const resp = await fetch(route);
          if (resp.ok) await cache.put(route, resp);
        } catch {}
      })
    );
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

  // Never intercept cross-origin requests (Supabase / Groq / Analytics)
  if (url.origin !== self.location.origin) return;

  // Skip Chrome extensions, api calls, range requests, downloads, and media streams (mp4/webm require native range requests)
  if (
    event.request.headers.get('range') ||
    url.protocol.startsWith('chrome-extension') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.startsWith('/videos/') ||
    url.pathname.startsWith('/downloads/') ||
    url.pathname.endsWith('.zip')
  ) {
    return;
  }

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
