import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const hasSession =
    Boolean(jar.get("xingyu_access_token")?.value) ||
    Boolean(jar.get("xingyu_refresh_token")?.value);

  if (!hasSession) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
