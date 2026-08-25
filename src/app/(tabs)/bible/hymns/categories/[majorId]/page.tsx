import BackButton from "@/components/common/BackButton";
import {
  formatRangeLabel,
  getHymnsByCategory,
  getMajorCategory,
  getMinorCategories,
} from "@/lib/bible/hymn";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function HymnMinorCategoryPage({
  params,
}: {
  params: Promise<{ majorId: string }>;
}) {
  const { majorId } = await params;
  const major = await getMajorCategory(Number(majorId));
  if (!major) notFound();

  const minors = await getMinorCategories(major.id);
  const cells = await Promise.all(
    minors.map(async (minor) => {
      const hymns = await getHymnsByCategory(minor.id);
      return { minor, rangeLabel: formatRangeLabel(hymns) };
    }),
  );

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {major.name}
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-3 p-1.5">
        {cells.map(({ minor, rangeLabel }) => (
          <Link
            key={minor.id}
            href={`/bible/hymns?categoryId=${minor.id}&categoryName=${encodeURIComponent(minor.name)}`}
            className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-lg bg-input-background p-3 text-center"
          >
            <span className="text-sm text-text-primary">
              {minor.name}
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
