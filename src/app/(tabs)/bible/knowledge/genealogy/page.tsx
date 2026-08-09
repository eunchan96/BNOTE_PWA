import BackButton from "@/components/common/BackButton";
import { getGenealogyCharts } from "@/lib/bible/genealogy";
import Link from "next/link";

export default async function GenealogyListPage() {
  const charts = await getGenealogyCharts();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">족보</h1>
      </header>

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {charts.map((chart) => (
          <li key={chart.id} className="border-b border-divider">
            <Link
              href={`/bible/knowledge/genealogy/${chart.id}`}
              className="block cursor-pointer px-4 py-3.5"
            >
              <p className="text-[15px] font-bold text-text-primary">
                {chart.title}
              </p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {chart.entries.length}명
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
