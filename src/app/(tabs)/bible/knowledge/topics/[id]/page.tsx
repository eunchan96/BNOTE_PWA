import BackButton from "@/components/common/BackButton";
import { getTopic, resolveTopicVerses } from "@/lib/bible/topics";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();

  const cards = await resolveTopicVerses(topic);

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {topic.title}
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        {cards.map((card, index) => (
          <Link
            key={index}
            href={`/bible/${card.ref.bookId}/${card.ref.chapter}`}
            className="cursor-pointer rounded-xl bg-input-background px-4 py-3.5"
          >
            <p className="text-13 font-bold text-brown-primary">{card.label}</p>
            <p className="mt-1.5 text-15 leading-relaxed text-text-primary">
              {card.text}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
