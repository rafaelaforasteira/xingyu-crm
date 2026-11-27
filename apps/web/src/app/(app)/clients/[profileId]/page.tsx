import { CustomerProfilePage } from "@/components/crm/clients/customer-profile-page";
export default async function Page({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  return <CustomerProfilePage profileId={decodeURIComponent(profileId)} />;
}
