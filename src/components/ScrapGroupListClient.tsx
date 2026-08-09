"use client";

import BackButton from "@/components/BackButton";
import PromptDialog from "@/components/PromptDialog";
import {
  createScrapGroup,
  deleteScrapGroup,
  getScrapGroups,
  renameScrapGroup,
  type ScrapGroupRow,
} from "@/lib/actions/scraps";
import Link from "next/link";
import { useState } from "react";

export default function ScrapGroupListClient({
  initialGroups,
}: {
  initialGroups: ScrapGroupRow[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [renaming, setRenaming] = useState<ScrapGroupRow | null>(null);

  async function refresh() {
    setGroups(await getScrapGroups());
  }

  async function handleDelete(group: ScrapGroupRow) {
    if (!confirm(`'${group.name}' 그룹과 그 안의 스크랩이 전부 삭제돼요. 계속할까요?`)) return;
    await deleteScrapGroup(group.id);
    refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">스크랩</h1>
        <button
          type="button"
          onClick={() => setIsManageMode((v) => !v)}
          className="mr-2 cursor-pointer px-2 text-sm text-white"
        >
          {isManageMode ? "완료" : "관리"}
        </button>
      </header>

      {isManageMode && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="m-4 cursor-pointer rounded-lg border border-dashed border-brown-primary py-3 text-center text-sm font-medium text-brown-primary"
        >
          + 새 그룹 추가
        </button>
      )}

      {groups.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          아직 스크랩 그룹이 없어요.
        </p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {groups.map((group) => (
          <li key={group.id} className="border-b border-divider">
            {isManageMode ? (
              <div className="flex items-center gap-2 px-4 py-3.5">
                <span className="flex-1 text-[15px] text-text-primary">
                  {group.name}
                </span>
                <button
                  type="button"
                  onClick={() => setRenaming(group)}
                  className="cursor-pointer px-2 text-sm text-brown-primary"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(group)}
                  className="cursor-pointer px-2 text-sm text-red-500"
                >
                  삭제
                </button>
              </div>
            ) : (
              <Link
                href={`/bible/scraps/${group.id}`}
                className="flex cursor-pointer items-center justify-between px-4 py-3.5"
              >
                <span className="text-[15px] text-text-primary">{group.name}</span>
                <span className="text-sm text-zinc-400">{group.count}개</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      {isAdding && (
        <PromptDialog
          title="새 그룹 추가"
          confirmLabel="추가"
          onConfirm={async (name) => {
            await createScrapGroup(name);
            refresh();
          }}
          onClose={() => setIsAdding(false)}
        />
      )}

      {renaming && (
        <PromptDialog
          title="그룹 이름 수정"
          initialValue={renaming.name}
          confirmLabel="저장"
          onConfirm={async (name) => {
            await renameScrapGroup(renaming.id, name);
            refresh();
          }}
          onClose={() => setRenaming(null)}
        />
      )}
    </div>
  );
}