import BackButton from "@/components/common/BackButton";
import { getTimelineEvents } from "@/lib/bible/timeline";
import Link from "next/link";

export default async function TimelinePage() {
  const events = await getTimelineEvents();

  const eventsWithEraFlag = events.map((event, index) => ({
    event,
    showEraHeader: index === 0 || event.era !== events[index - 1].era,
  }));

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">연대표</h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {eventsWithEraFlag.map(({ event, showEraHeader }) => (
          <div key={event.id}>
            {showEraHeader && (
              <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
                {event.era}
              </p>
            )}
            <Link
              href={`/bible/${event.keyBookId}/${event.keyChapter}`}
              className="block cursor-pointer px-4 py-2.5"
            >
              <div className="flex items-baseline gap-2">
                <p className="flex-1 text-[15px] font-bold text-text-primary">
                  {event.title}
                </p>
                <p className="text-[11px] text-zinc-400">{event.period}</p>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                {event.description}
              </p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
