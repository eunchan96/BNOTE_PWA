import SermonFormClient from "@/components/sermon/SermonFormClient";
import {
  getCategories,
  getPreachers,
  getSermon,
} from "@/lib/actions/sermon/sermons";
import { notFound } from "next/navigation";

export default async function EditSermonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [preachers, categories, sermon] = await Promise.all([
    getPreachers(),
    getCategories(),
    getSermon(Number(id)),
  ]);
  if (!sermon) notFound();

  return (
    <SermonFormClient
      preachers={preachers}
      categories={categories}
      existing={sermon}
    />
  );
}
