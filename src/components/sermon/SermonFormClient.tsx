"use client";

import BibleRangePickerSheet from "@/components/sermon/BibleRangePickerSheet";
import DatePickerSheet from "@/components/sermon/DatePickerSheet";
import NamePickerSheet from "@/components/sermon/NamePickerSheet";
import {
  createPreacher,
  createSermon,
  updateSermon,
  type BibleRefInput,
  type CategoryRow,
  type PreacherRow,
  type SermonDetail,
} from "@/lib/actions/sermon/sermons";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";
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
  const [preacherId, setPreacherId] = useState<number | null>(
    existing?.preacherId ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    existing?.categoryId ?? null,
  );
  const [refs, setRefs] = useState<BibleRefInput[]>(existing?.refs ?? []);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(
    existing?.photoUrls ?? [],
  );
  const [removedExistingUrls, setRemovedExistingUrls] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [preacherList, setPreacherList] = useState(preachers);
  const [showPreacherPicker, setShowPreacherPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [rangePicker, setRangePicker] = useState<{
    index: number | null;
  } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function refLabel(ref: BibleRefInput) {
    const book = getBook(ref.startBookId);
    const unit = chapterUnit(ref.startBookId);
    if (ref.startChapter === ref.endChapter) {
      return ref.startVerse === ref.endVerse
        ? `${book?.name} ${ref.startChapter}${unit} ${ref.startVerse}절`
        : `${book?.name} ${ref.startChapter}${unit} ${ref.startVerse}~${ref.endVerse}절`;
    }
    return `${book?.name} ${ref.startChapter}${unit} ${ref.startVerse}절~${ref.endChapter}${unit} ${ref.endVerse}절`;
  }

  function formatDateLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${y}년 ${m}월 ${d}일`;
  }

  function handleRangeSelected(ref: BibleRefInput) {
    if (rangePicker?.index === null || rangePicker?.index === undefined) {
      setRefs((prev) => [...prev, ref]);
    } else {
      setRefs((prev) =>
        prev.map((r, i) => (i === rangePicker.index ? ref : r)),
      );
    }
  }

  function handleRangeDelete() {
    if (rangePicker?.index === null || rangePicker?.index === undefined) return;
    setRefs((prev) => prev.filter((_, i) => i !== rangePicker.index));
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 5 - existingPhotoUrls.length - pendingPhotos.length;
    if (remaining <= 0) return;

    const picked = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));

    setPendingPhotos((prev) => [...prev, ...picked]);
  }

  function removeExistingPhoto(index: number) {
    const url = existingPhotoUrls[index];
    setRemovedExistingUrls((prev) => [...prev, url]);
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }
    setIsSaving(true);

    const supabase = createClient();
    const uploadedUrls: string[] = [];
    const uploadErrors: string[] = [];

    for (const { file } of pendingPhotos) {
      const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0] : "";
      const path = `${crypto.randomUUID()}${ext}`;
      const { error } = await supabase.storage
        .from("sermon-photos")
        .upload(path, file);
      if (error) {
        uploadErrors.push(error.message);
        continue;
      }
      const { data } = supabase.storage
        .from("sermon-photos")
        .getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    if (uploadErrors.length > 0) {
      alert(`사진 업로드 중 오류가 있었어요:\n${uploadErrors.join("\n")}`);
    }

    const finalPhotoUrls = [...existingPhotoUrls, ...uploadedUrls];
    const input = {
      title,
      sermonDate,
      memo,
      link,
      preacherId,
      categoryId,
      refs,
      photoUrls: finalPhotoUrls,
    };

    let newId: number | null = null;
    if (existing) {
      await updateSermon(existing.id, input);
    } else {
      newId = await createSermon(input);
    }

    // DB 저장이 끝난 뒤에 실제로 삭제된 기존 사진들을 Storage에서 정리한다.
    if (removedExistingUrls.length > 0) {
      const paths = removedExistingUrls
        .map((url) => url.split("/sermon-photos/")[1])
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await supabase.storage.from("sermon-photos").remove(paths);
      }
    }

    router.push(existing ? `/sermons/${existing.id}` : `/sermons/${newId}`);
  }

  const selectedPreacherName =
    preacherList.find((p) => p.id === preacherId)?.name ?? "설교자 선택";
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="flex h-[calc(100dvh-52px)] flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center bg-brown-primary pl-1">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="flex h-10 w-10 cursor-pointer items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M15.41,7.41L14,6l-6,6 6,6 1.41,-1.41L10.83,12z" />
          </svg>
        </button>
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {existing ? "설교 수정" : "설교 작성"}
        </h1>
        <button
          type="button"
          onClick={() => setShowDatePicker(true)}
          className="cursor-pointer px-3 py-3 text-[15px] text-white underline decoration-white/70 underline-offset-2"
        >
          {formatDateLabel(sermonDate)}
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <FormRow label="제목">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full rounded-lg bg-input-background px-3 py-2 text-[15px]"
          />
        </FormRow>

        <FormRow label="본문" className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {refs.length === 0 ? (
              <button
                type="button"
                onClick={() => setRangePicker({ index: null })}
                className="w-full cursor-pointer rounded-lg bg-input-background px-3 py-2 text-left text-[15px] text-zinc-400"
              >
                본문 선택
              </button>
            ) : (
              <>
                {refs.map((ref, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRangePicker({ index })}
                    className="min-w-0 flex-1 cursor-pointer truncate rounded-lg bg-input-background px-3 py-2 text-left text-[15px] text-text-primary"
                  >
                    {refLabel(ref)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRangePicker({ index: null })}
                  aria-label="본문 추가"
                  className="w-10 shrink-0 cursor-pointer rounded-lg bg-input-background text-lg text-zinc-400"
                >
                  +
                </button>
              </>
            )}
          </div>
        </FormRow>

        <FormRow label="설교" className="mt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreacherPicker(true)}
              className="flex-1 cursor-pointer truncate rounded-lg bg-input-background px-3 py-2 text-left text-[15px] text-text-primary"
            >
              {selectedPreacherName}
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(true)}
              className="flex-1 cursor-pointer truncate rounded-lg bg-input-background px-3 py-2 text-left text-[15px] text-text-primary"
            >
              {selectedCategory ? selectedCategory.name : "카테고리 선택"}
            </button>
          </div>
        </FormRow>

        {/* 메모: 안드로이드 원본 그대로 넉넉한 높이 + 우하단 서식 도구 오버레이(현재는 스텁, 리치텍스트 미지원) */}
        <div className="relative mt-3 flex flex-1 flex-col rounded-lg bg-input-background">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모"
            className="min-h-[160px] flex-1 resize-none bg-transparent p-3 pb-11 text-base outline-none"
          />
          <div className="absolute bottom-1.5 right-1.5 flex overflow-hidden rounded-xl bg-white shadow-sm">
            <span className="cursor-not-allowed px-2 py-2 text-[13px] text-text-secondary opacity-50">
              굵게
            </span>
            <span className="cursor-not-allowed px-2 py-2 text-[13px] text-text-secondary opacity-50">
              밑줄
            </span>
            <span className="cursor-not-allowed px-2 py-2 text-[13px] text-text-secondary opacity-50">
              색
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-input-background px-3 py-3 text-[15px] text-text-primary">
            {`+ 사진 추가 (${existingPhotoUrls.length + pendingPhotos.length}/5)`}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoSelect(e.target.files)}
              className="hidden"
            />
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="링크 추가 (선택)"
            className="flex-1 rounded-lg bg-input-background px-3 py-3 text-[15px]"
          />
        </div>

        {(existingPhotoUrls.length > 0 || pendingPhotos.length > 0) && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {existingPhotoUrls.map((url, index) => (
              <div key={url} className="relative h-20 w-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(index)}
                  aria-label="삭제"
                  className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {pendingPhotos.map((p, index) => (
              <div key={p.previewUrl} className="relative h-20 w-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-full w-full rounded-lg object-cover opacity-80"
                />
                <button
                  type="button"
                  onClick={() => removePendingPhoto(index)}
                  aria-label="삭제"
                  className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="mt-4 cursor-pointer rounded-lg bg-brown-primary py-3.5 text-center text-[15px] text-white disabled:opacity-60"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
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

      {rangePicker && (
        <BibleRangePickerSheet
          existing={rangePicker.index !== null ? refs[rangePicker.index] : null}
          onSelect={handleRangeSelected}
          onDelete={rangePicker.index !== null ? handleRangeDelete : undefined}
          onClose={() => setRangePicker(null)}
        />
      )}

      {showDatePicker && (
        <DatePickerSheet
          value={sermonDate}
          onSelect={setSermonDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}

function FormRow({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-11 shrink-0 text-[15px] text-text-secondary">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
