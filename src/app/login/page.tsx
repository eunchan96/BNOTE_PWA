import { signInWithGoogle, signInWithKakao } from "@/lib/actions/auth-actions";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const redirectPath = next && next.startsWith("/") ? next : "/bible";

  return (
    <div className="flex flex-1 flex-col bg-brown-primary">
      <div className="flex h-14 items-center px-1">
        <Link
          href="/bible"
          aria-label="뒤로가기"
          className="flex h-10 w-10 items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M15.41,7.41L14,6l-6,6 6,6 1.41,-1.41L10.83,12z" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <BookIcon />
        <h1 className="text-2xl font-bold text-white">BNOTE</h1>
        <p className="text-sm text-white/80">
          교회 공동체와 함께하는 성경 노트
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-t-3xl bg-white px-6 pb-10 pt-8">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
            {error === "cancelled" ? "로그인이 취소되었습니다." : error}
          </p>
        )}

        <form action={signInWithKakao.bind(null, redirectPath)}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] font-medium text-black cursor-pointer"
          >
            카카오로 시작하기
          </button>
        </form>

        <form action={signInWithGoogle.bind(null, redirectPath)}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white font-medium text-zinc-800 cursor-pointer"
          >
            구글로 시작하기
          </button>
        </form>
      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M12,21.5c-1.36,-1.09 -3.13,-1.62 -4.9,-1.62 -1.44,0 -2.89,0.35 -4.15,1.06 -0.11,0.06 -0.16,0.07 -0.24,0.07 -0.29,0 -0.46,-0.24 -0.46,-0.5V6.05c0,-0.23 0.13,-0.43 0.32,-0.53C4.06,4.65 5.68,4.25 7.1,4.25c1.77,0 3.54,0.53 4.9,1.62V21.5zM12,21.5V5.87c1.36,-1.09 3.13,-1.62 4.9,-1.62 1.42,0 3.04,0.4 4.53,1.27 0.19,0.1 0.32,0.3 0.32,0.53v14.46c0,0.26 -0.17,0.5 -0.46,0.5 -0.08,0 -0.13,-0.01 -0.24,-0.07 -1.26,-0.71 -2.71,-1.06 -4.15,-1.06 -1.77,0 -3.54,0.53 -4.9,1.62z" />
    </svg>
  );
}
