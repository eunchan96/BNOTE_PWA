import BackButton from "@/components/BackButton";
import HymnYoutubeCard from "@/components/HymnYoutubeCard";
import { getHymnByNumber } from "@/lib/hymn";
import { notFound } from "next/navigation";

export default async function HymnDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const hymn = await getHymnByNumber(Number(number));
  if (!hymn) notFound();

  const sheetFiles = hymn.image.split("|").filter((f) => f.trim() !== "");

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {hymn.number}장 {hymn.title}
        </h1>
      </header>

      <div className="flex flex-col gap-5 p-4">
        {sheetFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            {sheetFiles.map((fileName, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={fileName}
                src={`/hymn-data/images/${fileName}`}
                alt={`${hymn.number}장 악보 ${index + 1}페이지`}
                className="w-full rounded-lg"
              />
            ))}
          </div>
        )}

        <HymnYoutubeCard label="찬양" youtubeUrl={hymn.youtubeSong} />
        <HymnYoutubeCard label="MR" youtubeUrl={hymn.youtubeMr} />
      </div>
    </div>
  );
}
