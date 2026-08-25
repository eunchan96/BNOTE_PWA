import { getLastReadLocation } from "@/lib/actions/bible/preferences";
import { redirect } from "next/navigation";

export default async function BibleIndexPage() {
  const { bookId, chapter, verse } = await getLastReadLocation();
  redirect(`/bible/${bookId}/${chapter}${verse ? `?verse=${verse}` : ""}`);
}
