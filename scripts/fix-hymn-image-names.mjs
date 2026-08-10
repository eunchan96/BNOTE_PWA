import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const HYMN_DATA_DIR = path.join(process.cwd(), "public", "hymn-data");
const IMAGES_DIR = path.join(HYMN_DATA_DIR, "images");
const HYMNS_JSON_PATH = path.join(HYMN_DATA_DIR, "hymns.json");

async function main() {
  const raw = await readFile(HYMNS_JSON_PATH, "utf-8");
  const data = JSON.parse(raw);

  // 1단계: 같은 원본 파일을 여러 장이 공유하는 경우를 고려해서,
  // "원본 파일명 -> 새 파일명" 매핑을 먼저 전부 만든다. (실제 이름 변경은 아직 안 함)
  const renameMap = new Map(); // originalName -> newName

  for (const hymn of data.hymns) {
    if (!hymn.image) continue;
    const originalFiles = hymn.image.split("|").map((f) => f.trim()).filter(Boolean);

    for (let pageIndex = 0; pageIndex < originalFiles.length; pageIndex++) {
      const originalName = originalFiles[pageIndex];
      if (renameMap.has(originalName)) continue; // 이미 다른 장이 이 파일에 대한 새 이름을 정해둠

      const ext = path.extname(originalName) || ".jpg";
      const newName = `${hymn.number}-${pageIndex}${ext}`;
      renameMap.set(originalName, newName);
    }
  }

  // 2단계: 실제 파일 이름 변경은 고유 원본 파일명당 딱 한 번만 실행한다.
  let renamedCount = 0;
  let missingCount = 0;

  for (const [originalName, newName] of renameMap.entries()) {
    const oldPath = path.join(IMAGES_DIR, originalName);
    const newPath = path.join(IMAGES_DIR, newName);
    try {
      await rename(oldPath, newPath);
      renamedCount++;
    } catch (e) {
      console.warn(`[fix-hymn-image-names] "${originalName}" 파일을 못 찾았어요 (${e.code})`);
      missingCount++;
      renameMap.set(originalName, originalName); // 못 찾으면 원래 이름 그대로 둔다
    }
  }

  // 3단계: 각 찬송의 image 필드를 새 파일명으로 갱신한다 (공유 파일도 같은 새 이름을 참조).
  for (const hymn of data.hymns) {
    if (!hymn.image) continue;
    const originalFiles = hymn.image.split("|").map((f) => f.trim()).filter(Boolean);
    hymn.image = originalFiles.map((name) => renameMap.get(name) ?? name).join("|");
  }

  await writeFile(HYMNS_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");

  console.log(`[fix-hymn-image-names] 완료 — 이름 변경 ${renamedCount}개, 못 찾음 ${missingCount}개`);
}

main();