/* 屁屁小屋 · Service Worker
   目标只有一个：把这个小游戏装到手机主屏幕上之后，断网也能打开。

   策略刻意保守：
   - 外壳（html/css/js/图标）安装时先抓一遍，改版本号才会更新
   - 场景大图和精灵用「先用缓存，顺手更新」的方式，第二次进来就不用再下载
   - 只有 GET 且同源的请求才碰，别的（比如以后接的接口）直接放行 */
const VERSION = 'pipi-v12';
const SHELL = [
  './',
  './index.html',
  './story.html',
  './world.html',
  './styles.css',
  './css/world.css',
  './js/core.js',
  './js/weather.js',
  './js/ambient.js',
  './js/achv.js',
  './js/events.js',
  './js/daily.js',
  './js/ui.js',
  './js/world.js',
  './js/farm.js',
  './js/garden.js',
  './js/pasture.js',
  './js/town.js',
  './js/craft.js',
  './js/fishing.js',
  './js/rest.js',
  './js/npc.js',
  './js/duo.js',
  './js/story.js',
  './js/dinner.js',
  './js/moments.js',
  './js/boot.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/farm-art.webp',
  './assets/lake-art.webp',
  './assets/tvroom-art.webp',
  './assets/bath-art.webp',
  './assets/roof-art.webp',
  './assets/garden-art.webp',
  './assets/pasture-art.webp',
  './assets/town-art.webp',
  './assets/moment-tv.webp',
  './assets/moment-bath.webp',
  './assets/moment-sleep.webp',
  './assets/moment-kiss.webp',
  './assets/prop-junk-cloth.png',
  './assets/item-glass.png',
  './assets/item-fence.png',
  './assets/item-fuel.png',
  './assets/item-key.png',
  './assets/item-marble.png',
  './assets/item-postcard.png',
  './assets/item-cheese.png',
  './assets/item-yarn.png',
  './assets/item-mayo.png',
  './assets/item-jam.png',
  './assets/prop-bench.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // 单个文件失败不该让整次安装挂掉
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面本身：先要新的，网断了才用缓存
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(VERSION);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        const cached = await caches.match(request);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // 其余静态资源：先用缓存，同时悄悄更新
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request)
      .then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(VERSION);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
