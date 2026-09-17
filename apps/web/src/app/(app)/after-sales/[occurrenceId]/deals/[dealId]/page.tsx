"use client";

import { useParams } from "next/navigation";
import { DealWorkspacePage } from "@/components/crm/deal-workspace";

export default function Page() {
  const params = useParams<{ dealId: string }>();
  return <DealWorkspacePage dealId={params.dealId} />;
}
