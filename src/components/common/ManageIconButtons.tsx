// 관리 모드(수정/삭제)가 있는 목록 화면 전반에서 재사용하는 아이콘 버튼.
// h-9 w-9(36px)로 통일해서, 관리 모드 켜고 꺼도 행 높이가 거의 안 바뀌게 맞춰뒀다.

export function EditIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="수정"
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-zinc-400"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z" />
      </svg>
    </button>
  );
}

export function DeleteIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="삭제"
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-zinc-400"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6V19zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z" />
      </svg>
    </button>
  );
}