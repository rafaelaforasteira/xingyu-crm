"use client";

import { Suspense } from "react";
import { CompaniesPage } from "@/components/crm/companies-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <CompaniesPage />
    </Suspense>
  );
}
