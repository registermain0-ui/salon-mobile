/* サロン受付 V-26 Service Worker: 完全オフライン動作用 */
const CACHE = "este-mobile-v26";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
self.addEventListener("install", e => {
  // 自動skipWaitingはやめ、ユーザーの「更新」ボタンで切替える(作業中の強制リロード防止)
  // ★V-26: 新バージョンのファイルは必ずサーバーから取り直す(cache:"reload")。
  //  addAll だと端末のHTTPキャッシュ(GitHub Pagesは約10分)から古いファイルを保存してしまい、
  //  更新したのに古い画面のままになる不具合があったため。
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(async url => {
    const res = await fetch(new Request(url, { cache: "reload" }));
    if (!res || !res.ok) throw new Error("更新ファイルの取得に失敗: " + url);
    await c.put(url, res);
  }))));
});
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// キャッシュ優先(オフライン最優先)。ネットに繋がった時は裏で更新。
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // 同期API等の外部通信はキャッシュしない(常にネットワークへ)
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
