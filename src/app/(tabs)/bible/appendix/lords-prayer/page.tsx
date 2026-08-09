import VersionedTextViewer from "@/components/bible/VersionedTextViewer";
import { loadLordsPrayer } from "@/lib/bible/appendix";

export default async function LordsPrayerPage() {
  const content = await loadLordsPrayer();
  return <VersionedTextViewer content={content} />;
}
