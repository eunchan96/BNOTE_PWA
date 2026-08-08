import { getChapterVerses } from "@/lib/bible";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; chapter: string }> },
) {
  const { bookId, chapter } = await params;
  const translation = request.nextUrl.searchParams.get("translation") ?? "NKRV";

  const verses = await getChapterVerses(
    Number(bookId),
    Number(chapter),
    translation,
  );

  return NextResponse.json({ verses: verses.map((v) => ({ verse: v.verse })) });
}
