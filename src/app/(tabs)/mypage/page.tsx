import { signOut } from "@/lib/auth-actions";

export default function MyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-zinc-500">마이페이지 화면 (준비 중)</p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 cursor-pointer"
        >
          로그아웃 (테스트용)
        </button>
      </form>
    </div>
  );
}
