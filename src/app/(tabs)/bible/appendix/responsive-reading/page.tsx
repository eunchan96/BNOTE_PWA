import BackButton from "@/components/BackButton";
import { loadResponsiveReadings } from "@/lib/appendix";
import Link from "next/link";

export default async function ResponsiveReadingListPage() {
  const readings = await loadResponsiveReadings();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">교독문</h1>
      </header>

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {readings.map((r) => (
          <li key={r.number}>
            <Link
              href={`/bible/appendix/responsive-reading/${r.number}`}
              className="block cursor-pointer px-4 py-3 text-[15px] text-text-primary"
            >
              {r.number}. {r.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
