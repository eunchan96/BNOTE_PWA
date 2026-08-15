"use server";

import { cookies } from "next/headers";

const TRANSLATION_COOKIE = "bnote_translation";
const SECONDARY_COOKIE = "bnote_secondary";
const LAST_READ_BOOK_COOKIE = "bnote_last_book";
const LAST_READ_CHAPTER_COOKIE = "bnote_last_chapter";
const LAST_READ_VERSE_COOKIE = "bnote_last_verse";
const READING_PLAN_ENABLED_COOKIE = "bnote_reading_plan_enabled";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

/** 성경읽기표 켜짐/꺼짐 - 안드로이드 AppSettings.isReadingPlanEnabled와 동일하게
 * 기기(브라우저) 단위 설정이라 로그인 여부와 무관하게 저장한다. 실제로 장을
 * 읽음 처리하는 것은 로그인이 필요하다(reading-progress.ts). */
export async function saveReadingPlanEnabled(enabled: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(READING_PLAN_ENABLED_COOKIE, enabled ? "1" : "0", {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getReadingPlanEnabled(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(READING_PLAN_ENABLED_COOKIE)?.value === "1";
}

export async function saveTranslationPreference(
  primary: string,
  secondary: string | null,
) {
  const cookieStore = await cookies();
  cookieStore.set(TRANSLATION_COOKIE, primary, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  if (secondary) {
    cookieStore.set(SECONDARY_COOKIE, secondary, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  } else {
    cookieStore.delete(SECONDARY_COOKIE);
  }
}

/** 마지막으로 읽던 위치 - 앱(브라우저)을 완전히 껐다 켜도, 다른 탭에 갔다 와도
 * 이 위치로 열리게 하기 위함. 안드로이드 AppSettings.setLastRead와 동일한 역할.
 * verse는 picker/설교노트 등에서 특정 절로 명시적으로 이동했을 때만 넘겨준다 -
 * 그냥 스크롤해서 훑어보는 중에는 절 값을 덮어쓰지 않는다. */
export async function saveLastReadLocation(
  bookId: number,
  chapter: number,
  verse?: number,
) {
  const cookieStore = await cookies();
  cookieStore.set(LAST_READ_BOOK_COOKIE, String(bookId), {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  cookieStore.set(LAST_READ_CHAPTER_COOKIE, String(chapter), {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  if (verse) {
    cookieStore.set(LAST_READ_VERSE_COOKIE, String(verse), {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  } else {
    cookieStore.delete(LAST_READ_VERSE_COOKIE);
  }
}

export async function getLastReadLocation(): Promise<{
  bookId: number;
  chapter: number;
  verse: number | null;
}> {
  const cookieStore = await cookies();
  const bookId = Number(cookieStore.get(LAST_READ_BOOK_COOKIE)?.value ?? "1");
  const chapter = Number(
    cookieStore.get(LAST_READ_CHAPTER_COOKIE)?.value ?? "1",
  );
  const verseRaw = cookieStore.get(LAST_READ_VERSE_COOKIE)?.value;
  const verse = verseRaw ? Number(verseRaw) : null;
  return {
    bookId: Number.isInteger(bookId) && bookId >= 1 ? bookId : 1,
    chapter: Number.isInteger(chapter) && chapter >= 1 ? chapter : 1,
    verse: verse && Number.isInteger(verse) && verse >= 1 ? verse : null,
  };
}