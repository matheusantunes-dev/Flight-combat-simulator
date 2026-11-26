// Service worker do FCS: deixa o jogo instalável e jogável offline depois da 1ª visita.
// Modelos e sons usam "stale-while-revalidate": abre do cache na hora e baixa a versão nova em segundo plano,
// então um modelo trocado no repositório chega na próxima abertura (antes ficava preso no cache para sempre).
const VERSION = 'fcs-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isAsset = (u) =>
  /\/models\/.+\.glb$|\/sounds\/.+\.wav$|\/icons\//.test(u.pathname) ||
  /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // Página: rede primeiro (pega atualização), cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Modelos, sons, ícones e bibliotecas: responde do cache (rápido, funciona offline) e atualiza o cache pela rede
  if (isAsset(u)) {
    const net = fetch(req).then((r) => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); }
      return r;
    });
    e.respondWith(caches.match(req).then((hit) => hit || net));
    e.waitUntil(net.then(() => {}, () => {}));
  }
  // Todo o resto (IA local, multiplayer, ranking) vai direto para a rede
});
