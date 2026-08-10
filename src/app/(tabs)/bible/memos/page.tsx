import MemoListClient from "@/components/bible/MemoListClient";
import { getAllVerseMemos } from "@/lib/actions/bible/verse-memos";
import { getAllWordMemos } from "@/lib/actions/bible/word-memos";

export default async function MemoListPage() {
  const [verseMemos, wordMemos] = await Promise.all([
    getAllVerseMemos(),
    getAllWordMemos(),
  ]);

  return <MemoListClient verseMemos={verseMemos} wordMemos={wordMemos} />;
}
