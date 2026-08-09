"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function NamePickerSheet({
  title,
  items,
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: {
  title: string;
  items: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreate: (name: string) => Promise<{ id: number; name: string }>;
  onClose: () => void;
}) {
  const [list, setList] = useState(items);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsAdding(true);
    const created = await onCreate(newName.trim());
    setList((prev) => [...prev, created]);
    setNewName("");
    setIsAdding(false);
    onSelect(created.id);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />
      <div className="relative flex max-h-[70vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <h2 className="px-4 pt-4 pb-2 text-lg font-bold text-zinc-900">{title}</h2>
        <div className="border-t border-divider" />

        <div className="overflow-y-auto py-2">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={`block w-full cursor-pointer px-4 py-3 text-left text-[15px] ${
              selectedId === null ? "font-bold text-brown-primary" : "text-text-primary"
            }`}
          >
            미지정
          </button>
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`block w-full cursor-pointer px-4 py-3 text-left text-[15px] ${
                selectedId === item.id ? "font-bold text-brown-primary" : "text-text-primary"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-divider px-4 pt-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새로 추가"
            className="flex-1 rounded-lg border border-divider p-2.5 text-[15px]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="cursor-pointer rounded-lg bg-brown-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            추가
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}