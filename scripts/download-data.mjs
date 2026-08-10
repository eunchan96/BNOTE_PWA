// Vercel 빌드 시점에 Supabase Storage(app-data 버킷)의 파일들을 public/ 밑으로 내려받는다.
// 이 스크립트 덕분에 lib/bible.ts 등 기존 코드는 전혀 안 바꿔도, 빌드 결과물엔
// 지금처럼 public/bible-data/*.json 등이 그대로 로컬 파일로 존재하게 된다.
// git에는 이 파일들의 흔적이 전혀 안 남는다.

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "app-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "[download-data] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listAllFiles(prefix = "") {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;

  const files = [];
  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    // Supabase Storage는 "폴더"를 id가 없는 항목으로 표시한다.
    if (item.id === null) {
      files.push(...(await listAllFiles(itemPath)));
    } else {
      files.push(itemPath);
    }
  }
  return files;
}

async function main() {
  console.log("[download-data] 파일 목록 가져오는 중...");
  const files = await listAllFiles();
  console.log(`[download-data] ${files.length}개 파일 발견`);

  for (const filePath of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
    if (error) {
      console.error(`[download-data] ${filePath} 다운로드 실패:`, error.message);
      process.exit(1);
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    const outPath = path.join(process.cwd(), "public", filePath);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, buffer);
    console.log(`[download-data] ${filePath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  }

  console.log("[download-data] 완료");
}

main();