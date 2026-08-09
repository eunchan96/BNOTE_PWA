import ScrapGroupListClient from "@/components/bible/ScrapGroupListClient";
import { getScrapGroups } from "@/lib/actions/bible/scraps";

export default async function ScrapGroupListPage() {
  const groups = await getScrapGroups();
  return <ScrapGroupListClient initialGroups={groups} />;
}
