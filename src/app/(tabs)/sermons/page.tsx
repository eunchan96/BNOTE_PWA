import SermonTabsClient from "@/components/sermon/SermonTabsClient";
import { getSermons } from "@/lib/actions/sermon/sermons";
import { Suspense } from "react";

export default async function SermonsPage() {
  const sermons = await getSermons();
  return (
    <Suspense fallback={null}>
      <SermonTabsClient sermons={sermons} />
    </Suspense>
  );
}
