"use client";

import { Suspense } from "react";
import { ContactsPage } from "@/components/crm/contacts-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <ContactsPage />
    </Suspense>
  );
}
