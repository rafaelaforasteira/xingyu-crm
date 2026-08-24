"use client";

import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { SettingsCopy } from "@/lib/settings-i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";

const AREA_LABEL: Record<string, keyof SettingsCopy> = {
  dashboard: "areaDashboard",
  clients: "areaClients",
  pipelines: "areaPipelines",
  orders: "areaOrders",
  finance: "areaFinance",
  settings: "areaSettings",
  users: "areaUsers",
  teams: "areaTeams",
  profile: "areaProfile",
};

const CELL_LABEL: Record<string, keyof SettingsCopy> = {
  TOTAL: "cellTotal",
  ALL: "cellAll",
  SELF: "cellSelf",
  TEAM: "cellTeam",
  OWN: "cellOwn",
  MANAGE: "cellManage",
  PROFILE: "cellProfile",
  NONE: "cellNone",
};

export function SettingsPermissionsSection({ copy }: { copy: SettingsCopy }) {
  const matrix = useQuery({
    queryKey: [...queryKeys.settings, "permissions"],
    queryFn: settingsApi.permissions,
  });

  return (
    <Card data-settings-block="permissions">
      <CardHeader>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.permissions}
        </p>
        <p className="text-sm text-muted-foreground">{copy.permissionsHint}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {matrix.error ? <ErrorBanner message={copy.loadError} /> : null}
        {matrix.isLoading ? <Skeleton className="h-32 w-full" /> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <RoleCard title={copy.roleAdmin} hint={copy.roleAdminHint} />
          <RoleCard title={copy.roleManager} hint={copy.roleManagerHint} />
          <RoleCard title={copy.roleConsultant} hint={copy.roleConsultantHint} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">{copy.area}</th>
                <th className="p-3 font-medium">{copy.roleAdmin}</th>
                <th className="p-3 font-medium">{copy.roleManager}</th>
                <th className="p-3 font-medium">{copy.roleConsultant}</th>
              </tr>
            </thead>
            <tbody>
              {(matrix.data?.rows ?? []).map((row) => (
                <tr key={row.area} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    {copy[AREA_LABEL[row.area] ?? "area"]}
                  </td>
                  <td className="p-3">{copy[CELL_LABEL[row.cells.ADMIN] ?? "cellNone"]}</td>
                  <td className="p-3">{copy[CELL_LABEL[row.cells.MANAGER] ?? "cellNone"]}</td>
                  <td className="p-3">{copy[CELL_LABEL[row.cells.CONSULTANT] ?? "cellNone"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
