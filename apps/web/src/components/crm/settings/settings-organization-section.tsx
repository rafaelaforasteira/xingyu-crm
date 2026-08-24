"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { settingsText, type SettingsCopy } from "@/lib/settings-i18n";
import type { SettingsOverview } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "UTC",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
];

export function SettingsOrganizationSection({
  copy,
  overview,
  loading,
  error,
}: {
  copy: SettingsCopy;
  overview?: SettingsOverview;
  loading: boolean;
  error: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const organization = overview?.organization;
  const name = organization?.name || overview?.organizationName || "";
  const timezone = organization?.timezone || overview?.timezone || "America/Sao_Paulo";
  const currency = organization?.currency || overview?.currency || "BRL";
  const [form, setForm] = React.useState({ name, timezone, currency });

  React.useEffect(() => {
    setForm({ name, timezone, currency });
  }, [name, timezone, currency]);

  const save = useMutation({
    mutationFn: () => settingsApi.updateOrganization(form),
    onSuccess: async () => {
      toast.success(copy.saved);
      setEditing(false);
      await qc.invalidateQueries({ queryKey: [...queryKeys.settings, "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || copy.saveError),
  });

  const localeName = settingsText(undefined).localePt;
  const summary = [currency, localeName, timezone].filter(Boolean).join(" · ");

  return (
    <Card data-settings-block="organization">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.organization}
          </p>
          <p className="text-sm text-muted-foreground">{copy.organizationHint}</p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {copy.edit}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? <ErrorBanner message={copy.loadError} /> : null}
        {loading ? <Skeleton className="h-12 w-full" /> : null}
        {!loading && !editing ? (
          <div>
            <p className="text-lg font-semibold">{name || "—"}</p>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        ) : null}
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">{copy.orgName}</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="org-timezone">{copy.timezone}</Label>
                <Select
                  id="org-timezone"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  {TIMEZONES.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-currency">{copy.currency}</Label>
                <Select
                  id="org-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option>BRL</option>
                  <option>USD</option>
                  <option>CNY</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                {copy.cancel}
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
                {save.isPending ? copy.saving : copy.save}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
