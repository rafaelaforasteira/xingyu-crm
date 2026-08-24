"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/components/auth/auth-provider";
import { visibleSettingsBlocks } from "@/lib/settings-access";
import { settingsText } from "@/lib/settings-i18n";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SettingsProfileSection } from "./settings-profile-section";
import { SettingsUsersSection } from "./settings-users-section";
import { SettingsTeamsSection } from "./settings-teams-section";

export function SettingsCenter() {
  const { user, refreshCurrentUser, logout } = useAuth();
  const copy = settingsText(user?.locale);
  const blocks = visibleSettingsBlocks(user);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const profile = useQuery({
    queryKey: [...queryKeys.settings, "profile"],
    queryFn: settingsApi.profile,
  });
  const teams = useQuery({
    queryKey: [...queryKeys.settings, "admin-teams"],
    queryFn: settingsApi.teams,
    enabled: blocks.includes("users") || blocks.includes("teams"),
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        actions={
          <button
            type="button"
            aria-label={copy.signOut}
            title={copy.signOut}
            onClick={() => setLogoutOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex flex-col gap-6">
        <SettingsProfileSection
          copy={copy}
          profile={profile.data}
          loading={profile.isLoading}
          error={Boolean(profile.error)}
          onSaved={refreshCurrentUser}
        />
        {blocks.includes("users") ? (
          <SettingsUsersSection
            copy={copy}
            locale={user?.locale ?? "pt-BR"}
            currentUserId={user?.id}
            teams={teams.data ?? []}
          />
        ) : null}
        {blocks.includes("teams") ? <SettingsTeamsSection copy={copy} /> : null}
      </div>

      <Dialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={copy.logoutConfirmTitle}
        description={copy.logoutConfirmHint}
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loggingOut}
            onClick={() => setLogoutOpen(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } finally {
                setLoggingOut(false);
                setLogoutOpen(false);
              }
            }}
          >
            {loggingOut ? copy.signingOut : copy.logoutConfirmAction}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
