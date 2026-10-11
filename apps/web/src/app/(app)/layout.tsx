import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessCrmRoute, TRACKING_OVERVIEW_PATH } from "@xingyu/config";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const hasSession =
    Boolean(jar.get("xingyu_access_token")?.value) ||
    Boolean(jar.get("xingyu_refresh_token")?.value);

  if (!hasSession) {
    redirect("/login");
  }

  // Validate against the backend session, never trust a role decoded by the browser.
  const pathname = (await headers()).get("x-crm-pathname");
  if (pathname) {
    const upstream =
      process.env.API_URL?.replace(/\/+$/, "") ||
      `http://127.0.0.1:${process.env.API_PORT ?? 3333}`;
    let role: string | undefined;
    try {
      const response = await fetch(upstream + "/api/auth/me", {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (response.ok) role = (await response.json()).role;
    } catch {
      /* Client session resolution handles expired tokens and temporary outages. */
    }
    if (role && !canAccessCrmRoute(role, pathname)) redirect(TRACKING_OVERVIEW_PATH);
  }
  return <AppShell>{children}</AppShell>;
}
