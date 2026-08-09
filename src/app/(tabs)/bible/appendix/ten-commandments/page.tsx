import BackButton from "@/components/BackButton";
import { loadTenCommandments } from "@/lib/appendix";

export default async function TenCommandmentsPage() {
  const content = await loadTenCommandments();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {content.title}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {content.intro.map((line, i) => (
          <p key={i} className="mb-1 text-[15px] leading-relaxed text-text-primary">
            {line}
          </p>
        ))}

        <div className="h-3" />

        {content.commandments.map((item) => (
          <p
            key={item.number}
            className="mb-2.5 text-base leading-relaxed text-text-primary"
          >
            <span className="font-medium text-brown-primary">
              {item.text.slice(0, 4)}
            </span>
            {item.text.slice(4)}
          </p>
        ))}

        <p className="mb-4 text-[13px] text-text-secondary">
          ({content.reference})
        </p>

        <div className="border-t border-divider" />
        <div className="h-3" />

        <p className="mb-1 text-[15px] leading-relaxed text-text-primary">
          {content.summary.text}
        </p>
        <p className="text-[13px] text-text-secondary">
          ({content.summary.reference})
        </p>
      </div>
    </div>
  );
}