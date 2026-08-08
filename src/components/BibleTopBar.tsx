import BibleLocationPicker from "@/components/BibleLocationPicker";
import TranslationSelect from "@/components/TranslationSelect";

export default function BibleTopBar({
  bookId,
  chapter,
  title,
  translation,
}: {
  bookId: number;
  chapter: number;
  title: string;
  translation: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 overflow-x-auto bg-brown-primary px-2">
      <TranslationSelect
        bookId={bookId}
        chapter={chapter}
        translation={translation}
      />

      <BibleLocationPicker
        bookId={bookId}
        title={title}
        translation={translation}
      />

      <div className="flex-1" />

      <TopBarIconButton label="검색">
        <path d="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zM9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
      </TopBarIconButton>
      <TopBarIconButton label="북마크">
        <path d="M17,3H7c-1.1,0 -2,0.9 -2,2v16l7,-3 7,3V5c0,-1.1 -0.9,-2 -2,-2z" />
      </TopBarIconButton>
      <TopBarIconButton label="메뉴">
        <path d="M3,18h18v-2H3v2zM3,13h18v-2H3v2zM3,6v2h18V6H3z" />
      </TopBarIconButton>
    </header>
  );
}

function TopBarIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-90"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
        {children}
      </svg>
    </button>
  );
}
