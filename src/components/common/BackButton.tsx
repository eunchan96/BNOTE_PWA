"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
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
  );
}
