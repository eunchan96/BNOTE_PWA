"use client";

import { extractYoutubeId } from "@/lib/bible/hymn-types";
import { useState } from "react";

export default function HymnYoutubeCard({
  label,
  youtubeUrl,
}: {
  label: string;
  youtubeUrl: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const videoId = extractYoutubeId(youtubeUrl);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-text-secondary">{label}</p>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {isPlaying && videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`}
            title={label}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="h-full w-full"
          />
        ) : videoId ? (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="relative h-full w-full cursor-pointer"
            aria-label={`${label} 재생`}
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M8,5v14l11,-7z" />
              </svg>
            </span>
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
            영상을 찾을 수 없어요
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="더보기"
          className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2zM12,16c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2z" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute right-2 top-11 z-10 w-40 rounded-lg bg-white py-1 shadow-lg">
            <a
              href={
                videoId ? `https://youtube.com/watch?v=${videoId}` : youtubeUrl
              }
              target="_blank"
              rel="noreferrer"
              className="block cursor-pointer px-4 py-2 text-sm text-text-primary"
            >
              유튜브에서 보기
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(youtubeUrl);
                setIsMenuOpen(false);
              }}
              className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-text-primary"
            >
              링크 복사
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
