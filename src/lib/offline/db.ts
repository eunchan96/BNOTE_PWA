"use client";

// 별도 라이브러리(idb 등) 설치 없이, 기본 브라우저 IndexedDB API로 직접 구현한
// 아주 얇은 래퍼. 하이라이트/단어메모/구절메모를 기기에 저장해서 로컬 우선(offline-first)
// 구조를 만들기 위한 기반이다.

const DB_NAME = "bnote-offline";
const DB_VERSION = 1;

export const STORE_NAMES = {
  highlights: "highlights", // key: `${translation}-${bookId}-${chapter}` -> HighlightRangeMap
  wordMemos: "wordMemos", // key: `${translation}-${bookId}-${chapter}` -> WordMemoRow[]
  memoVerses: "memoVerses", // key: `${bookId}-${chapter}` -> number[]
  syncQueue: "syncQueue", // key: 자동증가 id -> { id, kind, args, createdAt }
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of Object.values(STORE_NAMES)) {
        if (db.objectStoreNames.contains(store)) continue;
        if (store === STORE_NAMES.syncQueue) {
          db.createObjectStore(store, { keyPath: "id", autoIncrement: true });
        } else {
          db.createObjectStore(store);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 기기 저장 실패(사파일 프라이빗 모드 등)는 조용히 무시한다 - 로컬 캐시는
    // "있으면 좋은" 보조 수단이지 필수 경로가 아니다.
  }
}

export async function idbAdd(store: string, value: unknown): Promise<number | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).add(value);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 무시
  }
}