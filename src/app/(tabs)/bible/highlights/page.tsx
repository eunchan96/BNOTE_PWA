import BackButton from "@/components/common/BackButton";
import { getHighlightedBooks } from "@/lib/actions/bible/highlights";
import Link from "next/link";

export default async function HighlightBookListPage() {
  const books = await getHighlightedBooks();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">하이라이트</h1>
      </header>

      {books.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          아직 하이라이트한 구절이 없어요.
        </p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {books.map((book) => (
          <li key={book.bookId}>
            <Link
              href={`/bible/highlights/${book.bookId}`}
              className="flex cursor-pointer items-center justify-between px-4 py-3.5"
            >
              <span className="truncate text-base text-text-primary">
                {book.bookName}
              </span>
              <span className="text-sm text-text-hint">{book.count}개</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
