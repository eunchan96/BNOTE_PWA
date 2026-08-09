import VersionedTextViewer from "@/components/VersionedTextViewer";
import { loadApostlesCreed } from "@/lib/appendix";

export default async function ApostlesCreedPage() {
  const content = await loadApostlesCreed();
  return <VersionedTextViewer content={content} />;
}