import BackButton from "@/components/common/BackButton";
import { loadResponsiveReadings } from "@/lib/bible/appendix";
import { notFound } from "next/navigation";

export default async function ResponsiveReadingDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const readings = await loadResponsiveReadings();
  const reading = readings.find((r) => r.number === Number(number));

  if (!reading) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {reading.number}. {reading.title}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {reading.lines.map((line, i) => {
          const isBold =
            line.speaker === "congregation" || line.speaker === "unison";
          const text =
            line.speaker === "unison" ? `(다같이) ${line.text}` : line.text;
          return (
            <p
              key={i}
              className={`mb-2.5 text-base leading-relaxed text-text-primary ${
                isBold ? "font-bold" : ""
              }`}
            >
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
