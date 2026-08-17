"use client";

import BibleSwipePager, {
  animateChapterTransition,
  getCachedChapterPeekSync,
} from "@/components/bible/BibleSwipePager";
import BibleTopBar from "@/components/bible/BibleTopBar";
import CustomScrollbar from "@/components/bible/CustomScrollbar";
import SaveLastReadLocation from "@/components/bible/SaveLastReadLocation";
import ScrollToVerse from "@/components/bible/ScrollToVerse";
import VerseList from "@/components/bible/VerseList";
import {
  getChapterPeek,
  type ChapterPeek,
} from "@/lib/actions/bible/chapter-peek";
import {
  chapterUnit,
  getBook,
  nextChapter,
  previousChapter,
} from "@/lib/bible/bible-books";
import { setCurrentBibleLocation } from "@/lib/bible/current-location-store";
import { useCallback, useEffect, useRef, useState } from "react";

export type ChapterData = {
  verses: ChapterPeek["verses"];
  secondaryVerses: ChapterPeek["secondaryVerses"];
};

/**
 * 성경 읽기 화면의 클라이언트 주도(SPA) 셸.
 *
 * 첫 진입(직접 URL 접속, 공유 링크, 새로고침)은 page.tsx(서버 컴포넌트)가 미리
 * 가져온 데이터를 initialData로 그대로 받아서 쓴다. 그 이후 스와이프/하단바
 * 버튼/피커로 장을 옮길 때는:
 *   1. 내부 state(bookId/chapter 등)만 바꾸고
 *   2. getChapterPeek(로컬 파일 기반, 서버 페이지 렌더링을 거치지 않는 순수 데이터
 *      조회)로 본문만 클라이언트에서 새로 받아오고
 *   3. window.history.pushState로 주소창만 조용히 맞춘다.
 * router.push를 전혀 쓰지 않기 때문에, Next.js가 그 장의 페이지를 서버에서
 * 다시 렌더링하는 과정 자체가 생략된다.
 *
 * 하이라이트/단어메모/구절메모/설교아이콘/읽음체크는 VerseList·BibleTopBar가
 * 이미 bookId/chapter prop 변화에 반응해서 알아서 다시 가져오므로 이 컴포넌트가
 * 따로 신경 쓸 필요가 없다.
 */
export default function BibleChapterShell({
  initialBookId,
  initialChapter,
  initialVerse,
  translation,
  secondary,
  isLoggedIn,
  readingPlanEnabled,
  autoScrollEnabled,
  scrollSpeed,
  initialData,
}: {
  initialBookId: number;
  initialChapter: number;
  initialVerse: number | null;
  translation: string;
  secondary?: string;
  isLoggedIn?: boolean;
  readingPlanEnabled?: boolean;
  autoScrollEnabled?: boolean;
  scrollSpeed?: number;
  initialData: ChapterData;
}) {
  const [bookId, setBookId] = useState(initialBookId);
  const [chapter, setChapter] = useState(initialChapter);
  const [targetVerse, setTargetVerse] = useState<number | null>(initialVerse);
  const [data, setData] = useState<ChapterData>(initialData);
  const loadedKeyRef = useRef(`${initialBookId}-${initialChapter}`);

  const book = getBook(bookId);
  const unit = chapterUnit(bookId);
  const title = book ? `${book.name} ${chapter}${unit}` : "";

  const buildHref = useCallback(
    (destBookId: number, destChapter: number, verse?: number) => {
      const params = new URLSearchParams();
      if (translation) params.set("translation", translation);
      if (secondary) params.set("secondary", secondary);
      if (verse) params.set("verse", String(verse));
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return `/bible/${destBookId}/${destChapter}${suffix}`;
    },
    [translation, secondary],
  );

  // 실제로 장을 옮기는 함수. 서버 이동(router.push) 없이 내부 상태만 바꾸고
  // 주소창은 history.pushState로만 맞춘다.
  const navigateTo = useCallback(
    (destBookId: number, destChapter: number, verse?: number) => {
      setBookId(destBookId);
      setChapter(destChapter);
      setTargetVerse(verse ?? null);
      window.history.pushState(
        null,
        "",
        buildHref(destBookId, destChapter, verse),
      );
    },
    [buildHref],
  );

  // bookId/chapter가 바뀌면(내부 이동) 새 장 데이터를 클라이언트에서 직접 받아온다.
  // 최초 렌더링(initialData와 동일한 장)에서는 서버가 이미 준 데이터를 그대로 쓰고
  // 다시 요청하지 않는다.
  useEffect(() => {
    const key = `${bookId}-${chapter}`;
    if (key === loadedKeyRef.current) return;
    let cancelled = false;

    // 스와이프 미리보기 캐시에 이미 있으면(대부분 그렇다 - 항상 ±3까지 미리 데워둠)
    // 네트워크 호출 없이 즉시 반영된다. 캐시 적중(동기)과 서버 조회(비동기) 두 경로를
    // 하나의 Promise 체인으로 합쳐서, setData 호출은 항상 .then() 콜백 안에서만
    // 일어나게 한다 - effect 몸체에서 곧바로 setState를 부르면 안 된다는 규칙 때문.
    const cached = getCachedChapterPeekSync(
      bookId,
      chapter,
      translation,
      secondary,
    );
    const peekPromise = cached
      ? Promise.resolve(cached)
      : getChapterPeek(bookId, chapter, translation, secondary);

    peekPromise.then((peek) => {
      if (cancelled || !peek) return;
      setData({ verses: peek.verses, secondaryVerses: peek.secondaryVerses });
      loadedKeyRef.current = key;
    });

    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, translation, secondary]);

  // 브라우저 뒤로가기/앞으로가기 대응 - history.pushState로 직접 바꾼 주소창은
  // Next.js 라우터가 모르는 상태이므로, popstate를 직접 듣고 내부 상태를 맞춘다.
  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/^\/bible\/(\d+)\/(\d+)/);
      if (!match) return;
      const params = new URLSearchParams(window.location.search);
      setBookId(Number(match[1]));
      setChapter(Number(match[2]));
      const verseParam = params.get("verse");
      setTargetVerse(verseParam ? Number(verseParam) : null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // 하단바(BottomNav)는 이 셸 바깥(루트 레이아웃)에 있어서 usePathname()만으로는
  // 지금 이 셸이 클라이언트에서 어느 장으로 옮겨갔는지 알 수 없다. 그래서 장이 바뀔
  // 때마다 공유 저장소에 직접 알려주고, 언마운트되면(다른 탭으로 이동하면) 비운다.
  useEffect(() => {
    setCurrentBibleLocation({ bookId, chapter, translation, secondary });
    return () => setCurrentBibleLocation(null);
  }, [bookId, chapter, translation, secondary]);

  // 하단바 버튼에서도 스와이프와 동일한 전환 애니메이션 + 캐시를 쓸 수 있도록,
  // 이 셸의 navigate 함수를 전역에 노출한다(다른 화면에서도 쓰는 기존 패턴과 동일하게
  // DOM/전역 통신 방식을 사용).
  useEffect(() => {
    window.__bnoteBibleShellNavigate = (direction: "prev" | "next") => {
      const dest =
        direction === "prev"
          ? previousChapter(bookId, chapter)
          : nextChapter(bookId, chapter);
      if (!dest) return;
      const destTitleBook = getBook(dest.bookId);
      const destTitle = destTitleBook
        ? `${destTitleBook.name} ${dest.chapter}${chapterUnit(dest.bookId)}`
        : undefined;
      animateChapterTransition(direction, destTitle, () =>
        navigateTo(dest.bookId, dest.chapter),
      );
    };
    // 책/장/절 피커처럼 인접하지 않은 임의 장으로 이동할 때는 슬라이드 방향이
    // 의미 없으므로 애니메이션 없이 바로 이동한다.
    window.__bnoteBibleShellGoTo = (
      destBookId: number,
      destChapter: number,
      verse?: number,
    ) => {
      navigateTo(destBookId, destChapter, verse);
    };
    return () => {
      delete window.__bnoteBibleShellNavigate;
      delete window.__bnoteBibleShellGoTo;
    };
  }, [bookId, chapter, navigateTo]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[52px] flex flex-col overflow-hidden">
      <BibleTopBar
        bookId={bookId}
        chapter={chapter}
        title={title}
        translation={translation}
        secondary={secondary}
        isLoggedIn={isLoggedIn}
        readingPlanEnabled={readingPlanEnabled}
        autoScrollEnabled={autoScrollEnabled}
        scrollSpeed={scrollSpeed}
      />

      <BibleSwipePager
        bookId={bookId}
        chapter={chapter}
        translation={translation}
        secondary={secondary}
        currentTitle={title}
        onNavigate={(dest) => navigateTo(dest.bookId, dest.chapter)}
      >
        <div className="relative h-full min-h-0 flex-1">
          <div
            id="bible-scroll-container"
            className="scrollbar-hide h-full overflow-y-auto overscroll-contain"
          >
            <div
              id="bible-scroll-content"
              className="mx-auto flex w-full max-w-2xl flex-col pb-2"
            >
              <SaveLastReadLocation
                bookId={bookId}
                chapter={chapter}
                verse={targetVerse}
              />
              <ScrollToVerse verse={targetVerse} />
              <VerseList
                bookId={bookId}
                chapter={chapter}
                translation={translation}
                verses={data.verses}
                secondaryVerses={data.secondaryVerses}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
          <CustomScrollbar />
        </div>
      </BibleSwipePager>
    </div>
  );
}
