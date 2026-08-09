"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function signInWithProvider(
  provider: "kakao" | "google",
  redirectPath: string,
) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "로그인 중 오류가 발생했습니다.")}`,
    );
  }

  redirect(data.url);
}

export async function signInWithKakao(redirectPath: string) {
  await signInWithProvider("kakao", redirectPath);
}

export async function signInWithGoogle(redirectPath: string) {
  await signInWithProvider("google", redirectPath);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}