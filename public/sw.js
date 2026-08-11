const DATA_CACHE = "bnote-data-v1";
// 절대 안 바뀌는 무거운 정적 데이터만 오프라인 캐싱 대상으로 삼는다.
const CACHEABLE_PREFIXES = [
  "/bible-data/",
  "/hymn-data/",
  "/appendix-data/",
  "/knowledge-data/",
];

function isCacheableDataRequest(url) {
  return CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // 성경 본문/찬송가/부록/배경지식 JSON: 캐시 우선, 오프라인에서도 빠르게 열람 가능
  if (isCacheableDataRequest(url)) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // 그 외(페이지, JS, API 등)는 항상 네트워크 우선 — 새 기능/수정 사항이 즉시 반영된다.
  // 오프라인일 때만 최후 수단으로 캐시를 본다 (있으면).
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});