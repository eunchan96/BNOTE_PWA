import VersionedTextViewer from "@/components/bible/VersionedTextViewer";
import { loadApostlesCreed } from "@/lib/bible/appendix";

export default async function ApostlesCreedPage() {
  const content = await loadApostlesCreed();
  return <VersionedTextViewer content={content} />;
}
