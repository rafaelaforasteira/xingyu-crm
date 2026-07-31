import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ pipelineId: string }>;
}) {
  const { pipelineId } = await params;
  redirect(`/pipelines/${pipelineId}/settings/stages`);
}
