"use client";

import { Suspense } from "react";
import { AutomationStudio } from "@/components/crm/automations/automation-studio";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ automationId: string }>();
  return (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <AutomationStudio automationId={params.automationId} />
    </Suspense>
  );
}
