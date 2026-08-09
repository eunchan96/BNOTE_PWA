import BookmarkListClient from "@/components/BookmarkListClient";
import { getBookmarkedVerses } from "@/lib/actions/bookmarks";

export default async function BookmarkListPage() {
  const rows = await getBookmarkedVerses();
  return <BookmarkListClient initialRows={rows} />;
}