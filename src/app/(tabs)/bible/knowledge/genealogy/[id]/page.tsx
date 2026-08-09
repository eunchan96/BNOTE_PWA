import BackButton from "@/components/common/BackButton";
import { getGenealogyChart } from "@/lib/bible/genealogy";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GenealogyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chart = await getGenealogyChart(id);
  if (!chart) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {chart.title}
        </h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <p className="mb-4 text-base leading-relaxed text-text-primary">
          {chart.description}
        </p>

        {chart.entries.map((entry, index) => (
          <div key={index}>
            <div className="rounded-lg bg-zinc-50 p-3.5">
              <p className="text-base font-bold text-brown-primary">
                {entry.name}
              </p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {entry.relation}
              </p>
              {entry.note && (
                <p className="mt-1.5 text-[13px] text-text-primary">
                  {entry.note}
                </p>
              )}
            </div>
            {index !== chart.entries.length - 1 && (
              <p className="py-1 text-center text-lg text-zinc-300">↓</p>
            )}
          </div>
        ))}

        <Link
          href={`/bible/${chart.keyBookId}/${chart.keyChapter}`}
          className="mt-6 cursor-pointer rounded-lg bg-brown-primary px-4 py-3 text-center font-medium text-white"
        >
          {chart.keyVerseLabel} 보러 가기
        </Link>
      </div>
    </div>
  );
}
