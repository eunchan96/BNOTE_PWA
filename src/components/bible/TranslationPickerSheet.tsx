"use client";

import { saveTranslationPreference } from "@/lib/actions/bible/preferences";
import { TRANSLATIONS } from "@/lib/bible/translations";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

type Step = "primary" | "secondary";

export default function TranslationPickerSheet({
  bookId,
  chapter,
  translation,
  secondary,
  onClose,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  secondary?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verseParam = searchParams.get("verse");

  const [step, setStep] = useState<Step>("primary");
  const [selectedPrimary, setSelectedPrimary] = useState(translation);

  function pickPrimary(code: string) {
    setSelectedPrimary(code);
    setStep("secondary");
  }

  function pickSecondary(code: string | null) {
    saveTranslationPreference(selectedPrimary, code);

    const params = new URLSearchParams();
    params.set("translation", selectedPrimary);
    if (code) params.set("secondary", code);
    if (verseParam) params.set("verse", verseParam);
    router.push(`/bible/${bookId}/${chapter}?${params.toString()}`);
    onClose();
  }

  const primaryDisplayName =
    TRANSLATIONS.find((t) => t.code === selectedPrimary)?.displayName ?? "";
  const secondaryOptions = TRANSLATIONS.filter(
    (t) => t.code !== selectedPrimary,
  );

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
      />

      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold text-zinc-900">
            {step === "primary"
              ? "주성경 선택"
              : `${primaryDisplayName} + 함께보기 선택`}
          </h2>
        </div>

        <div className="flex px-2">
          <PickerTab
            label="주성경"
            selected={step === "primary"}
            onClick={() => setStep("primary")}
          />
          <PickerTab
            label="함께보기"
            selected={step === "secondary"}
            onClick={() => setStep("secondary")}
          />
        </div>

        <div className="border-t border-divider" />

        <div className="max-h-[420px] overflow-y-auto py-2">
          {step === "primary" &&
            TRANSLATIONS.map((t) => (
              <ListRow
                key={t.code}
                label={t.displayName}
                selected={t.code === selectedPrimary}
                onClick={() => pickPrimary(t.code)}
              />
            ))}

          {step === "secondary" && (
            <>
              {secondaryOptions.map((t) => (
                <ListRow
                  key={t.code}
                  label={t.displayName}
                  selected={t.code === secondary}
                  onClick={() => pickSecondary(t.code)}
                />
              ))}
              <ListRow
                label="선택 안 함"
                selected={!secondary}
                onClick={() => pickSecondary(null)}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PickerTab({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border-b-2 py-3 text-[15px] ${
        selected
          ? "border-brown-primary font-bold text-brown-primary"
          : "border-transparent text-zinc-500"
      } cursor-pointer`}
    >
      {label}
    </button>
  );
}

function ListRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3.5 text-left text-base ${
        selected ? "font-bold text-brown-primary" : "text-text-primary"
      } cursor-pointer`}
    >
      {label}
    </button>
  );
}
