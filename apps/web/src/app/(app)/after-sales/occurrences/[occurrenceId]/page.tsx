"use client";

import { useParams } from "next/navigation";
import { OccurrenceDetailPage } from "@/components/crm/lifecycle-pages";

export default function Page() {
  const params = useParams<{ occurrenceId: string }>();
  return <OccurrenceDetailPage occurrenceId={params.occurrenceId} />;
}
