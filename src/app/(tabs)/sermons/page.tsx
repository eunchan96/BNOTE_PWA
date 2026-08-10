import SermonTabsClient from "@/components/sermon/SermonTabsClient";
import { getSermons } from "@/lib/actions/sermon/sermons";

export default async function SermonsPage() {
  const sermons = await getSermons();
  return <SermonTabsClient sermons={sermons} />;
}
