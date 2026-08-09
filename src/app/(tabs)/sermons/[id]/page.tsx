import BackButton from "@/components/BackButton";
import { deleteSermon, getSermon } from "@/lib/actions/sermons";
import { chapterUnit, getBook } from "@/lib/bible-books";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sermon = await getSermon(Number(id));
  if (!sermon) notFound();

  async function handleDelete() {
    "use server";
    if (!sermon) return;
    await deleteSermon(sermon.id);
    redirect("/sermons");
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {sermon.title}
        </h1>
        <Link
          href={`/sermons/${sermon.id}/edit`}
          className="mr-2 cursor-pointer px-2 text-sm text-white"
        >
          수정
        </Link>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span>{sermon.sermonDate}</span>
          {sermon.preacherName && <span>{sermon.preacherName}</span>}
        </div>

        {sermon.refs.length > 0 && (
          <div className="flex flex-col gap-1">
            {sermon.refs.map((r, i) => {
              const book = getBook(r.startBookId);
              const unit = chapterUnit(r.startBookId);
              const label =
                r.startVerse === r.endVerse
                  ? `${book?.name} ${r.startChapter}${unit} ${r.startVerse}절`
                  : `${book?.name} ${r.startChapter}${unit} ${r.startVerse}~${r.endVerse}절`;
              return (
                <Link
                  key={i}
                  href={`/bible/${r.startBookId}/${r.startChapter}?verse=${r.startVerse}`}
                  className="cursor-pointer text-[15px] font-medium text-brown-primary"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {sermon.memo && (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-primary">
            {sermon.memo}
          </p>
        )}

        {sermon.link && (
          <a
            href={sermon.link}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer text-sm text-brown-primary underline"
          >
            {sermon.link}
          </a>
        )}

        {sermon.photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sermon.photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-28 w-28 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        <form action={handleDelete} className="mt-4">
          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg border border-red-200 py-3 text-center text-sm text-red-500"
          >
            삭제
          </button>
        </form>
      </div>
    </div>
  );
}
