"use client";

import { Suspense } from "react";
import { DashboardPage } from "@/components/crm/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <DashboardPage />
    </Suspense>
  );
}
