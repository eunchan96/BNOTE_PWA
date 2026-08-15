import BackButton from "@/components/common/BackButton";
import { getUnitById } from "@/lib/bible/units";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { id } = await params;
  const unit = await getUnitById(id);
  if (!unit) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {unit.title}
        </h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <p className="text-13 font-bold text-brown-primary">{unit.category}</p>
        <h2 className="mt-1.5 text-22 font-bold text-text-primary">
          {unit.title}
        </h2>

        <p className="mt-2.5 text-15 leading-relaxed text-text-secondary">
          {unit.summary}
        </p>
        <p className="mt-3 text-15 leading-relaxed text-text-primary">
          {unit.description}
        </p>

        <Link
          href={`/bible/${unit.keyBookId}/${unit.keyChapter}`}
          className="mt-6 cursor-pointer rounded-lg bg-input-background p-[14px] text-center text-15 font-bold text-brown-primary"
        >
          {unit.keyVerseLabel} 보러 가기
        </Link>
      </div>
    </div>
  );
}
