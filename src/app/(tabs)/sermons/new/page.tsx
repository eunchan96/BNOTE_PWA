import SermonFormClient from "@/components/sermon/SermonFormClient";
import { getCategories, getPreachers } from "@/lib/actions/sermon/sermons";

export default async function NewSermonPage() {
  const [preachers, categories] = await Promise.all([
    getPreachers(),
    getCategories(),
  ]);
  return <SermonFormClient preachers={preachers} categories={categories} />;
}
