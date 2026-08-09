import SermonListClient from "@/components/SermonListClient";
import { getSermons } from "@/lib/actions/sermons";

export default async function SermonsPage() {
  const sermons = await getSermons();
  return <SermonListClient sermons={sermons} />;
}
