import BackButton from "@/components/BackButton";
import { getTopics } from "@/lib/topics";
import Link from "next/link";

export default async function TopicListPage() {
  const topics = await getTopics();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          상황에 따라 찾는 말씀
        </h1>
      </header>

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {topics.map((topic) => (
          <li key={topic.id} className="border-b border-divider">
            <Link
              href={`/bible/knowledge/topics/${topic.id}`}
              className="block cursor-pointer px-4 py-4 text-[15px] text-text-primary"
            >
              {topic.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}