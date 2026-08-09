import MemoListClient from "@/components/MemoListClient";
import { getAllVerseMemos } from "@/lib/actions/verse-memos";
import { getAllWordMemos } from "@/lib/actions/word-memos";

export default async function MemoListPage() {
  const [verseMemos, wordMemos] = await Promise.all([
    getAllVerseMemos(),
    getAllWordMemos(),
  ]);

  return <MemoListClient verseMemos={verseMemos} wordMemos={wordMemos} />;
}
