// 로컬 public/bible-data/{translation}.json 파일들을 Supabase bible_verse 테이블에 넣는
// 일회성 시딩 스크립트입니다. 실제 읽기 화면은 이 테이블을 쓰지 않고 로컬 JSON을 직접 읽습니다.
// (src/lib/bible.ts 참고) 이 테이블은 "전체 성경 검색" 기능을 위해서만 존재합니다.
//
// 실행 방법:
//   1. .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가 (Supabase 대시보드 > Project Settings > API 에서 확인)
//      절대 NEXT_PUBLIC_ 접두어 붙이지 말 것 — 브라우저에 노출되면 안 되는 키입니다.
//   2. node --env-file=.env.local scripts/seed-bible.mjs

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CHUNK_SIZE = 2000;

// public/bible-data/*.json 은 전부 flat 포맷으로 정규화되어 저장됩니다.
// (NIV/ESV 원본은 nested 구조였지만, 로컬 파일로 저장할 때 이미 flat으로 변환해뒀습니다.)
const FLAT_TRANSLATIONS = ["nkrv", "krv", "ksb", "klb", "easy", "kjv", "niv", "esv"];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey);

  for (const code of FLAT_TRANSLATIONS) {
    await seedTranslation(supabase, code);
  }

  console.log("===== 전체 시딩 완료 =====");
}

async function seedTranslation(supabase, code) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "bible-data",
    `${code}.json`,
  );

  let raw;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    console.warn(`[seed-bible] ${code}.json 파일이 없어 건너뜁니다.`);
    return;
  }

  const verses = JSON.parse(raw);
  const translationCode = code.toUpperCase();

  const rows = verses.map((v) => ({
    translation: translationCode,
    book_id: v.book_id,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
    title: v.title ?? null,
    title2: v.title2 ?? null,
    text2: v.text2 ?? null,
  }));

  console.log(`[seed-bible] ${translationCode} ${rows.length}개 절 업로드 시작...`);

  for (let from = 0; from < rows.length; from += CHUNK_SIZE) {
    const chunk = rows.slice(from, from + CHUNK_SIZE);
    const { error } = await supabase
      .from("bible_verse")
      .upsert(chunk, { onConflict: "translation,book_id,chapter,verse" });

    if (error) {
      console.error(`[seed-bible] ${translationCode} 청크 저장 실패:`, error);
      process.exit(1);
    }
    console.log(
      `[seed-bible] ${translationCode} ${Math.min(from + CHUNK_SIZE, rows.length)}/${rows.length} 절 저장 완료`,
    );
  }
}

main();
