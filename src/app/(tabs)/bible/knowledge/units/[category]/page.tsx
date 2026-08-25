import BackButton from "@/components/common/BackButton";
import { getUnitsByCategory, groupUnitsForDisplay } from "@/lib/bible/units";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function UnitCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryParam } = await params;
  const category = decodeURIComponent(categoryParam);

  const units = await getUnitsByCategory(category);
  if (units.length === 0) notFound();

  const eraGroups = groupUnitsForDisplay(units);

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {category}
        </h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {eraGroups.map((eraGroup, eraIndex) => (
          <div key={eraIndex}>
            {eraGroup.era && (
              <p className="px-4 pb-1.5 pt-4 text-13 font-bold text-brown-primary">
                {eraGroup.era}
              </p>
            )}
            {eraGroup.subGroups.map((subGroup, subIndex) => (
              <div key={subIndex}>
                {subGroup.subcategory && (
                  <p className="px-4 pb-1 pt-2.5 text-xs text-text-hint">
                    {subGroup.subcategory}
                  </p>
                )}
                {subGroup.units.map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/bible/knowledge/units/${encodeURIComponent(category)}/${unit.id}`}
                    className="block cursor-pointer px-4 py-2.5"
                  >
                    <p className="text-15 font-bold text-text-primary">
                      {unit.title}
                    </p>
                    <p className="mt-0.5 text-13 text-text-secondary">
                      {unit.summary}
                    </p>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
