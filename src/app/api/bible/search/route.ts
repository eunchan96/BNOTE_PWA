import { searchVerses } from "@/lib/bible/bible";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const translation = request.nextUrl.searchParams.get("translation") ?? "NKRV";
  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";

  const results = await searchVerses(translation, keyword);
  return NextResponse.json({ results });
}