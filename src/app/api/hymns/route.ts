import { getAllHymns, getHymnsByCategory } from "@/lib/bible/hymn";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  const hymns = categoryId
    ? await getHymnsByCategory(Number(categoryId))
    : await getAllHymns();

  return NextResponse.json({ hymns });
}