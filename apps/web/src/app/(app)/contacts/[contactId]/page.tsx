"use client";

import { useParams } from "next/navigation";
import { ContactDetailPage } from "@/components/crm/contact-detail-page";

export default function Page() {
  const params = useParams<{ contactId: string }>();
  return <ContactDetailPage contactId={params.contactId} />;
}
