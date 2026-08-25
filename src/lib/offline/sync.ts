"use client";

import { idbAdd, idbDelete, idbGetAll, STORE_NAMES } from "@/lib/offline/db";
import {
  applyPartialHighlight,
  applyVerseHighlight,
  removePartialHighlight,
  removeVerseHighlight,
} from "@/lib/actions/bible/highlights";
import { deleteWordMemo, saveWordMemo } from "@/lib/actions/bible/word-memos";
import { deleteVerseMemo, saveVerseMemo } from "@/lib/actions/bible/verse-memos";

type QueueEntry = {
  id: number;
  kind: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
  createdAt: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HANDLERS: Record<string, (...args: any[]) => Promise<unknown>> = {
  applyPartialHighlight,
  applyVerseHighlight,
  removePartialHighlight,
  removeVerseHighlight,
  saveWordMemo,
  deleteWordMemo,
  saveVerseMemo,
  deleteVerseMemo,
};

/** 지금 당장 서버로 안 보내고, 큐에 넣어둔 뒤 백그라운드로 처리를 시도한다.
 * 이렇게 하면 호출부(UI)는 네트워크를 전혀 기다리지 않는다. */
export async function enqueueSync(kind: keyof typeof HANDLERS, args: unknown[]) {
  await idbAdd(STORE_NAMES.syncQueue, { kind, args, createdAt: Date.now() });
  void processSyncQueue();
}

let processing = false;

/** 큐에 쌓인 것들을 순서대로 서버에 반영한다. 하나라도 실패하면(오프라인 등)
 * 그 뒤 순서를 건드리지 않기 위해 거기서 멈추고, 다음 트리거(온라인 복귀,
 * 새 항목 추가, 페이지 재방문) 때 이어서 시도한다. */
export async function processSyncQueue() {
  if (processing) return;
  processing = true;
  try {
    const entries = await idbGetAll<QueueEntry>(STORE_NAMES.syncQueue);
    entries.sort((a, b) => a.createdAt - b.createdAt);
    for (const entry of entries) {
      const handler = HANDLERS[entry.kind];
      if (!handler) {
        // 알 수 없는 종류(예전 버전의 큐 항목 등)는 버린다.
        await idbDelete(STORE_NAMES.syncQueue, entry.id);
        continue;
      }
      try {
        await handler(...entry.args);
        await idbDelete(STORE_NAMES.syncQueue, entry.id);
      } catch (err) {
        console.error("[offline-sync] failed, will retry later:", entry.kind, err);
        break;
      }
    }
  } finally {
    processing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void processSyncQueue();
  });
}