import { getChapterVerses } from "@/lib/bible";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; chapter: string }> },
) {
  const { bookId, chapter } = await params;
  const translation = request.nextUrl.searchParams.get("translation") ?? "NKRV";

  try {
    const supabase = await createClient();
    const verses = await getChapterVerses(
      supabase,
      Number(bookId),
      Number(chapter),
      translation,
    );
    return NextResponse.json({ verses: verses.map((v) => ({ verse: v.verse })) });
  } catch {
    return NextResponse.json({ msg: "본문을 불러오지 못했습니다." }, { status: 500 });
  }
}