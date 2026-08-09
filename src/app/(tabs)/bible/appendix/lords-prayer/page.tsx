import VersionedTextViewer from "@/components/VersionedTextViewer";
import { loadLordsPrayer } from "@/lib/appendix";

export default async function LordsPrayerPage() {
  const content = await loadLordsPrayer();
  return <VersionedTextViewer content={content} />;
}