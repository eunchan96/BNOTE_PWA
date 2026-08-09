import BookmarkListClient from "@/components/bible/BookmarkListClient";
import { getBookmarkedVerses } from "@/lib/actions/bible/bookmarks";

export default async function BookmarkListPage() {
  const rows = await getBookmarkedVerses();
  return <BookmarkListClient initialRows={rows} />;
}
