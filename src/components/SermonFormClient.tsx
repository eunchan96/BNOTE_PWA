"use client";

import NamePickerSheet from "@/components/NamePickerSheet";
import {
  createPreacher,
  createSermon,
  updateSermon,
  type BibleRefInput,
  type CategoryRow,
  type PreacherRow,
  type SermonDetail,
} from "@/lib/actions/sermons";
import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible-books";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SermonFormClient({
  preachers,
  categories,
  existing,
}: {
  preachers: PreacherRow[];
  categories: CategoryRow[];
  existing?: SermonDetail;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [sermonDate, setSermonDate] = useState(
    existing?.sermonDate ?? new Date().toISOString().slice(0, 10),
  );
  const [memo, setMemo] = useState(existing?.memo ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [preacherId, setPreacherId] = useState<number | null>(existing?.preacherId ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(existing?.categoryId ?? null);
  const [refs, setRefs] = useState<BibleRefInput[]>(existing?.refs ?? []);
  const [photoUrls, setPhotoUrls] = useState<string[]>(existing?.photoUrls ?? []);
  const [preacherList, setPreacherList] = useState(preachers);
  const [showPreacherPicker, setShowPreacherPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function addRef() {
    setRefs((prev) => [
      ...prev,
      { startBookId: 1, startChapter: 1, startVerse: 1, endBookId: 1, endChapter: 1, endVerse: 1 },
    ]);
  }

  function updateRef(index: number, patch: Partial<BibleRefInput>) {
    setRefs((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRef(index: number) {
    setRefs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 5 - photoUrls.length;
    if (remaining <= 0) return;

    setIsUploading(true);
    const supabase = createClient();
    const newUrls: string[] = [];

    for (const file of Array.from(files).slice(0, remaining)) {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("sermon-photos").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("sermon-photos").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setPhotoUrls((prev) => [...prev, ...newUrls]);
    setIsUploading(false);
  }

  function removePhoto(index: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }
    setIsSaving(true);
    const input = { title, sermonDate, memo, link, preacherId, categoryId, refs, photoUrls };

    if (existing) {
      await updateSermon(existing.id, input);
      router.push(`/sermons/${existing.id}`);
    } else {
      const id = await createSermon(input);
      router.push(`/sermons/${id}`);
    }
  }

  const selectedPreacherName =
    preacherList.find((p) => p.id === preacherId)?.name ?? "설교자 선택";
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="닫기"
          className="flex h-10 w-10 cursor-pointer items-center justify-center"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z" />
          </svg>
        </button>
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {existing ? "설교 수정" : "설교 작성"}
        </h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="mr-3 cursor-pointer text-sm font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="rounded-lg border border-divider p-3 text-base"
        />

        <input
          type="date"
          value={sermonDate}
          onChange={(e) => setSermonDate(e.target.value)}
          className="rounded-lg border border-divider p-3 text-base"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreacherPicker(true)}
            className="flex-1 cursor-pointer rounded-lg border border-divider p-3 text-left text-[15px] text-text-primary"
          >
            {selectedPreacherName}
          </button>
          <button
            type="button"
            onClick={() => setShowCategoryPicker(true)}
            className="flex-1 cursor-pointer rounded-lg border border-divider p-3 text-left text-[15px] text-text-primary"
          >
            {selectedCategory ? selectedCategory.name : "카테고리 선택"}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-text-secondary">본문 구절</p>
            <button
              type="button"
              onClick={addRef}
              className="cursor-pointer text-sm text-brown-primary"
            >
              + 구절 추가
            </button>
          </div>
          {refs.map((ref, index) => (
            <div key={index} className="mb-2 flex items-center gap-1.5 rounded-lg border border-divider p-2">
              <select
                value={ref.startBookId}
                onChange={(e) => {
                  const bookId = Number(e.target.value);
                  updateRef(index, { startBookId: bookId, endBookId: bookId });
                }}
                className="rounded border border-divider p-1.5 text-sm"
              >
                {BIBLE_BOOKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={ref.startChapter}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateRef(index, { startChapter: v, endChapter: v });
                }}
                className="w-14 rounded border border-divider p-1.5 text-sm"
                placeholder="장"
              />
              <input
                type="number"
                value={ref.startVerse}
                onChange={(e) => updateRef(index, { startVerse: Number(e.target.value) })}
                className="w-14 rounded border border-divider p-1.5 text-sm"
                placeholder="시작절"
              />
              <span className="text-zinc-400">~</span>
              <input
                type="number"
                value={ref.endVerse}
                onChange={(e) => updateRef(index, { endVerse: Number(e.target.value) })}
                className="w-14 rounded border border-divider p-1.5 text-sm"
                placeholder="끝절"
              />
              <button
                type="button"
                onClick={() => removeRef(index)}
                aria-label="삭제"
                className="ml-auto cursor-pointer text-zinc-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="설교 메모"
          className="min-h-[160px] rounded-lg border border-divider p-3 text-[15px]"
        />

        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="관련 링크 (선택)"
          className="rounded-lg border border-divider p-3 text-base"
        />

        <div>
          <p className="mb-2 text-sm font-bold text-text-secondary">사진 ({photoUrls.length}/5)</p>
          <div className="flex flex-wrap gap-2">
            {photoUrls.map((url, index) => (
              <div key={url} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label="삭제"
                  className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {photoUrls.length < 5 && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-divider text-zinc-400">
                {isUploading ? "..." : "+"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {showPreacherPicker && (
        <NamePickerSheet
          title="설교자 선택"
          items={preacherList}
          selectedId={preacherId}
          onSelect={setPreacherId}
          onCreate={async (name) => {
            const created = await createPreacher(name);
            setPreacherList((prev) => [...prev, created]);
            return created;
          }}
          onClose={() => setShowPreacherPicker(false)}
        />
      )}

      {showCategoryPicker && (
        <NamePickerSheet
          title="카테고리 선택"
          items={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          onCreate={async () => {
            throw new Error("카테고리 추가는 다음에 지원할게요");
          }}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
    </div>
  );
}