"use client";

import { useParams } from "next/navigation";
import { OrderDetailPage } from "@/components/crm/orders-page";

export default function Page() {
  const params = useParams<{ orderId: string }>();
  return <OrderDetailPage orderId={params.orderId} />;
}
