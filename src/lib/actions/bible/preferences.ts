"use server";

import { cookies } from "next/headers";

const TRANSLATION_COOKIE = "bnote_translation";
const SECONDARY_COOKIE = "bnote_secondary";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

export async function saveTranslationPreference(
  primary: string,
  secondary: string | null,
) {
  const cookieStore = await cookies();
  cookieStore.set(TRANSLATION_COOKIE, primary, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  if (secondary) {
    cookieStore.set(SECONDARY_COOKIE, secondary, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  } else {
    cookieStore.delete(SECONDARY_COOKIE);
  }
}