"use client";

import PromptDialog from "@/components/common/PromptDialog";
import {
  createScrapGroup,
  getScrapGroups,
  type ScrapGroupRow,
} from "@/lib/actions/bible/scraps";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ScrapGroupPickerSheet({
  onSelect,
  onClose,
}: {
  onSelect: (groupId: number, groupName: string) => void;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<ScrapGroupRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    getScrapGroups().then(setGroups);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />

      <div className="relative flex max-h-[70vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold text-zinc-900">
            스크랩할 그룹 선택
          </h2>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="cursor-pointer text-sm font-medium text-brown-primary"
          >
            + 새 그룹
          </button>
        </div>
        <div className="border-t border-divider" />

        <div className="overflow-y-auto py-2">
          {groups.length === 0 && (
            <p className="p-6 text-center text-sm text-text-secondary">
              그룹이 없어요. 먼저 새 그룹을 만들어주세요.
            </p>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.id, g.name)}
              className="block w-full cursor-pointer px-4 py-3 text-left text-[15px] text-text-primary"
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {isAdding && (
        <PromptDialog
          title="새 그룹 추가"
          confirmLabel="추가"
          onConfirm={async (name) => {
            await createScrapGroup(name);
            getScrapGroups().then(setGroups);
          }}
          onClose={() => setIsAdding(false)}
        />
      )}
    </div>,
    document.body,
  );
}
