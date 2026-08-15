import BackButton from "@/components/common/BackButton";
import {
  formatRangeLabel,
  getHymnsByCategory,
  getMajorCategories,
  getMinorCategories,
} from "@/lib/bible/hymn";
import Link from "next/link";

export default async function HymnMajorCategoryPage() {
  const majors = await getMajorCategories();

  const cells = await Promise.all(
    majors.map(async (major) => {
      const minors = await getMinorCategories(major.id);
      const hymnsInAllMinors = (
        await Promise.all(minors.map((m) => getHymnsByCategory(m.id)))
      ).flat();
      const rangeLabel = formatRangeLabel(hymnsInAllMinors);

      // 소분류가 하나뿐이면 (안드로이드와 동일하게) 소분류 그리드를 건너뛰고 바로 찬송 목록으로
      const href =
        minors.length === 1
          ? `/bible/hymns?categoryId=${minors[0].id}&categoryName=${encodeURIComponent(minors[0].name)}`
          : `/bible/hymns/categories/${major.id}`;

      return { major, rangeLabel, href };
    }),
  );

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">찬송 분류</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 p-1.5">
        {cells.map(({ major, rangeLabel, href }) => (
          <Link
            key={major.id}
            href={href}
            className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-lg bg-input-background p-3 text-center"
          >
            <span className="text-sm text-text-primary">
              {major.name}
              {rangeLabel && (
                <>
                  <br />
                  {rangeLabel}
                </>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
