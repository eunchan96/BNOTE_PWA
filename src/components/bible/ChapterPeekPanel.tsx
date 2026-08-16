import type { ChapterPeek } from "@/lib/actions/bible/chapter-peek";

export default function ChapterPeekPanel({
  peek,
}: {
  peek: ChapterPeek | null;
}) {
  if (!peek) {
    return <div className="h-full w-full bg-surface-background" />;
  }

  const maxVerse = peek.verses[peek.verses.length - 1]?.verse ?? 0;
  const numberColumnWidth = maxVerse >= 100 ? "w-[26px]" : "w-[20px]";

  return (
    <div className="h-full w-full overflow-hidden bg-surface-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col pb-2">
        {peek.verses.map((verse, i) => {
          const secondary = peek.secondaryVerses?.find(
            (v) => v.verse === verse.verse,
          );
          const secondaryFirstLine = secondary
            ? verse.title2
              ? secondary.text
              : secondary.text2
                ? `${secondary.text} ${secondary.text2}`
                : secondary.text
            : null;
          // 실제 VerseList와 동일한 규칙: 첫 절이면서 소제목이 없을 때만 넓은 간격.
          const extraTopSpacing = i === 0 && !verse.title;

          return (
            <div key={verse.verse}>
              {verse.title && (
                <p className="break-keep px-3 pt-2.5 pb-0 text-sm font-bold text-brown-primary">
                  &lt;{verse.title}&gt;
                </p>
              )}
              <div
                className={`flex gap-1 py-1 pb-2 pl-1.5 pr-3 ${extraTopSpacing ? "pt-3" : "pt-1"}`}
              >
                <span
                  className={`${numberColumnWidth} mt-[3px] shrink-0 self-start text-center text-sm font-bold text-text-secondary`}
                >
                  {verse.verse}
                </span>
                <div className="flex-1">
                  <p className="break-keep select-none text-base leading-relaxed text-text-primary">
                    {verse.text}
                  </p>
                  {secondaryFirstLine && (
                    <p className="break-keep mt-1 text-15 leading-relaxed text-brown-light">
                      {secondaryFirstLine}
                    </p>
                  )}
                </div>
              </div>

              {verse.title2 && (
                <>
                  <p className="break-keep px-3 pb-0 text-sm font-bold text-brown-primary">
                    &lt;{verse.title2}&gt;
                  </p>
                  <div className="flex gap-1 py-1 pb-2 pl-1.5 pr-3">
                    <span className={`${numberColumnWidth} shrink-0`} />
                    <div className="flex-1">
                      <p className="break-keep select-none text-base leading-relaxed text-text-primary">
                        {verse.text2}
                      </p>
                      {secondary?.text2 && (
                        <p className="break-keep mt-1 text-15 leading-relaxed text-brown-light">
                          {secondary.text2}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
