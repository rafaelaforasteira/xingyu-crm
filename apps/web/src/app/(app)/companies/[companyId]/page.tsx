"use client";

import { useParams } from "next/navigation";
import { CompanyDetailPage } from "@/components/crm/companies-page";

export default function Page() {
  const params = useParams<{ companyId: string }>();
  return <CompanyDetailPage companyId={params.companyId} />;
}
