import SermonListClient from "@/components/sermon/SermonListClient";
import { getSermons } from "@/lib/actions/sermon/sermons";

export default async function SermonsPage() {
  const sermons = await getSermons();
  return <SermonListClient sermons={sermons} />;
}
