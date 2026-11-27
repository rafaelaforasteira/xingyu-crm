"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { interpolate, type SettingsCopy } from "@/lib/settings-i18n";
import {
  daysUntilArchive,
  daysUntilInviteExpiry,
  formatLastAccess,
  roleLabel,
} from "@/lib/settings-format";
import type { ManagedUser, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";
import { SettingsActionItem, SettingsActionMenu } from "./settings-action-menu";

type StatusFilter = "ALL" | "ACTIVE" | "INVITED" | "INACTIVE";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function SettingsUsersSection({
  copy,
  locale,
  currentUserId,
  teams,
}: {
  copy: SettingsCopy;
  locale: string;
  currentUserId?: string;
  teams: Team[];
}) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = React.useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<ManagedUser | null>(null);
  const [confirm, setConfirm] = React.useState<
    | { type: "deactivate" | "revoke" | "role" | "cancelInvite"; user: ManagedUser; role?: ManagedUser["authRole"] }
    | null
  >(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const users = useQuery({
    queryKey: [
      ...queryKeys.settings,
      "managed-users",
      { search: debouncedSearch, page, status: statusFilter },
    ],
    queryFn: () =>
      usersApi.list({
        page,
        pageSize: 8,
        search: debouncedSearch || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: [...queryKeys.settings, "managed-users"] });

  const rows = users.data?.data ?? [];
  const totals = users.data?.totals ?? {
    all: users.data?.meta.total ?? 0,
    active: 0,
    invited: 0,
    inactive: 0,
    activeAdmins: 0,
  };
  const isLastAdmin = (user: ManagedUser) =>
    user.authRole === "ADMIN" &&
    user.status === "ACTIVE" &&
    (totals.activeAdmins ?? 0) <= 1;

  const emptyMessage = (() => {
    if (rows.length > 0 || users.isLoading) return null;
    if (debouncedSearch) {
      return interpolate(copy.emptyUsersSearch, { query: debouncedSearch });
    }
    if (statusFilter === "INVITED") return copy.emptyInvited;
    if (statusFilter !== "ALL") return copy.emptyUsersFilter;
    return copy.emptyUsers;
  })();

  return (
    <Card data-settings-block="users" className="border-border/80 shadow-none">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary/75" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.users}
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <UserStatusFilters
            copy={copy}
            value={statusFilter}
            totals={totals}
            onChange={setStatusFilter}
          />
          <div className="flex w-full items-center gap-2 sm:w-auto xl:ml-auto">
            <div className="relative min-w-0 flex-1 sm:w-[17.5rem] sm:flex-none lg:w-[18.5rem]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label={copy.searchUser}
                placeholder={copy.searchUser}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Button
              type="button"
              className="h-9 shrink-0 gap-1.5 px-3"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {copy.addUser}
            </Button>
          </div>
        </div>

        {statusFilter === "INACTIVE" ? (
          <p className="text-xs text-muted-foreground">{copy.archivePolicyHint}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {users.error ? <ErrorBanner message={copy.loadError} /> : null}
        {users.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        {!users.isLoading && emptyMessage ? (
          <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {debouncedSearch ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSearchInput("")}
              >
                {copy.clearSearch}
              </Button>
            ) : null}
          </div>
        ) : null}

        {!users.isLoading && rows.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-3 font-medium">{copy.columnName}</th>
                    <th className="py-2.5 pr-3 font-medium">{copy.team}</th>
                    <th className="py-2.5 pr-3 font-medium">{copy.function}</th>
                    <th className="py-2.5 pr-3 font-medium">{copy.status}</th>
                    <th className="py-2.5 pr-3 font-medium">{copy.lastAccess}</th>
                    <th className="py-2.5 font-medium">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 pr-3">
                        <UserIdentity user={user} />
                      </td>
                      <td className="py-3 pr-3 text-foreground">
                        {user.team?.name ?? copy.noTeam}
                      </td>
                      <td className="py-3 pr-3">{roleLabel(user.authRole, copy)}</td>
                      <td className="py-3 pr-3">
                        <UserStatusCell copy={copy} user={user} />
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {formatLastAccess(user.lastLoginAt, copy, locale)}
                      </td>
                      <td className="py-3">
                        <UserActions
                          copy={copy}
                          user={user}
                          currentUserId={currentUserId}
                          lastAdmin={isLastAdmin(user)}
                          onEdit={() => setEditUser(user)}
                          onConfirm={setConfirm}
                          onResend={async () => {
                            const result = await usersApi.resendInvite(user.id);
                            setInviteUrl(result.inviteUrl);
                            toast.success(copy.inviteResent);
                            invalidate();
                          }}
                          onReactivate={async () => {
                            await usersApi.reactivate(user.id);
                            toast.success(copy.userReactivated);
                            invalidate();
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map((user) => (
                <div key={user.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <UserIdentity user={user} />
                    <UserActions
                      copy={copy}
                      user={user}
                      currentUserId={currentUserId}
                      lastAdmin={isLastAdmin(user)}
                      onEdit={() => setEditUser(user)}
                      onConfirm={setConfirm}
                      onResend={async () => {
                        const result = await usersApi.resendInvite(user.id);
                        setInviteUrl(result.inviteUrl);
                        toast.success(copy.inviteResent);
                        invalidate();
                      }}
                      onReactivate={async () => {
                        await usersApi.reactivate(user.id);
                        toast.success(copy.userReactivated);
                        invalidate();
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <UserStatusCell copy={copy} user={user} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {user.team?.name ?? copy.noTeam} · {roleLabel(user.authRole, copy)} ·{" "}
                    {formatLastAccess(user.lastLoginAt, copy, locale)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {(users.data?.meta.totalPages ?? 1) > 1 ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (users.data?.meta.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              →
            </Button>
          </div>
        ) : null}
      </CardContent>

      <InviteDialog
        copy={copy}
        open={inviteOpen}
        teams={teams}
        onOpenChange={setInviteOpen}
        onInviteUrl={setInviteUrl}
        onDone={invalidate}
      />
      <EditUserDialog
        copy={copy}
        user={editUser}
        teams={teams}
        lastAdmin={editUser ? isLastAdmin(editUser) : false}
        onOpenChange={(open) => !open && setEditUser(null)}
        onDone={invalidate}
        onConfirmRole={(role) => editUser && setConfirm({ type: "role", user: editUser, role })}
      />
      <ConfirmDialog
        copy={copy}
        currentUserId={currentUserId}
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onDone={invalidate}
      />
      {inviteUrl ? (
        <Dialog open onOpenChange={() => setInviteUrl(null)} title={copy.inviteSent}>
          <p className="mb-3 break-all text-sm text-muted-foreground">{inviteUrl}</p>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              toast.success(copy.inviteCopied);
            }}
          >
            {copy.copyInvite}
          </Button>
        </Dialog>
      ) : null}
    </Card>
  );
}

function UserStatusFilters({
  copy,
  value,
  totals,
  onChange,
}: {
  copy: SettingsCopy;
  value: StatusFilter;
  totals: { all: number; active: number; invited: number; inactive: number };
  onChange: (value: StatusFilter) => void;
}) {
  const chips: Array<{
    id: StatusFilter;
    label: string;
    count: number;
    dot?: string;
  }> = [
    { id: "ALL", label: copy.filterAll, count: totals.all },
    { id: "ACTIVE", label: copy.filterActive, count: totals.active, dot: "bg-emerald-500" },
    { id: "INVITED", label: copy.filterInvited, count: totals.invited, dot: "bg-primary/70" },
    { id: "INACTIVE", label: copy.filterInactive, count: totals.inactive, dot: "bg-muted-foreground/50" },
  ];

  return (
    <div
      role="tablist"
      aria-label={copy.users}
      className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5"
    >
      {chips.map((chip) => {
        const selected = value === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-pressed={selected}
            onClick={() => onChange(chip.id)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition",
              selected
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-border/80 bg-background text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {chip.dot ? (
              <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} aria-hidden />
            ) : null}
            <span>{chip.label}</span>
            <span className={cn("tabular-nums", selected ? "text-primary" : "text-muted-foreground")}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} src={user.avatarUrl} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

function UserStatusCell({ copy, user }: { copy: SettingsCopy; user: ManagedUser }) {
  if (user.status === "ACTIVE") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        {copy.active}
      </div>
    );
  }

  if (user.status === "INVITED") {
    const days = daysUntilInviteExpiry(user.inviteExpiresAt);
    let micro = copy.awaitingAccess;
    if (days === null) micro = copy.awaitingAccess;
    else if (days === 0) micro = copy.inviteExpired;
    else if (days === 1) micro = copy.inviteExpiresTomorrow;
    else micro = interpolate(copy.inviteExpiresIn, { days });

    return (
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full border border-primary/70" aria-hidden />
          {copy.invited}
        </div>
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{micro}</p>
      </div>
    );
  }

  const days = daysUntilArchive(user.deactivatedAt);
  return (
    <div className="min-w-0">
      <div className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground/50" aria-hidden />
        {copy.inactive}
      </div>
      {days !== null ? (
        <p
          className="mt-0.5 text-[11px] leading-tight text-muted-foreground"
          title={copy.archivePolicyHint}
        >
          {days === 0 ? copy.archiveToday : interpolate(copy.archiveInDays, { days })}
        </p>
      ) : null}
    </div>
  );
}

function UserActions({
  copy,
  user,
  currentUserId,
  lastAdmin,
  onEdit,
  onConfirm,
  onResend,
  onReactivate,
}: {
  copy: SettingsCopy;
  user: ManagedUser;
  currentUserId?: string;
  lastAdmin: boolean;
  onEdit: () => void;
  onConfirm: (value: {
    type: "deactivate" | "revoke" | "cancelInvite";
    user: ManagedUser;
  }) => void;
  onResend: () => Promise<void>;
  onReactivate: () => Promise<void>;
}) {
  return (
    <SettingsActionMenu label={`${copy.actions} · ${user.name}`}>
      <SettingsActionItem onClick={onEdit}>{copy.editUser}</SettingsActionItem>

      {user.status === "ACTIVE" ? (
        <>
          <SettingsActionItem onClick={() => onConfirm({ type: "revoke", user })}>
            {copy.revokeSessions}
          </SettingsActionItem>
          <SettingsActionItem
            destructive
            disabled={lastAdmin || user.id === currentUserId}
            onClick={() => onConfirm({ type: "deactivate", user })}
          >
            {copy.deactivate}
          </SettingsActionItem>
        </>
      ) : null}

      {user.status === "INVITED" ? (
        <>
          <SettingsActionItem onClick={() => void onResend()}>{copy.resendInvite}</SettingsActionItem>
          <SettingsActionItem
            destructive
            onClick={() => onConfirm({ type: "cancelInvite", user })}
          >
            {copy.cancelInvite}
          </SettingsActionItem>
        </>
      ) : null}

      {user.status === "INACTIVE" ? (
        <SettingsActionItem onClick={() => void onReactivate()}>{copy.reactivate}</SettingsActionItem>
      ) : null}
    </SettingsActionMenu>
  );
}

function InviteDialog({
  copy,
  open,
  teams,
  onOpenChange,
  onInviteUrl,
  onDone,
}: {
  copy: SettingsCopy;
  open: boolean;
  teams: Team[];
  onOpenChange: (open: boolean) => void;
  onInviteUrl: (url: string) => void;
  onDone: () => void;
}) {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    role: "CONSULTANT" as ManagedUser["authRole"],
    teamId: "",
  });
  const invite = useMutation({
    mutationFn: () =>
      usersApi.invite({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        teamId: form.teamId || undefined,
      }),
    onSuccess: (result) => {
      toast.success(copy.inviteSent);
      onInviteUrl(result.inviteUrl);
      onOpenChange(false);
      setForm({ name: "", email: "", phone: "", role: "CONSULTANT", teamId: "" });
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={copy.addUser}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label={copy.name} htmlFor="invite-name">
          <Input id="invite-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Labeled>
        <Labeled label={copy.email} htmlFor="invite-email">
          <Input id="invite-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Labeled>
        <Labeled label={copy.phone} htmlFor="invite-phone">
          <Input id="invite-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Labeled>
        <Labeled label={copy.function} htmlFor="invite-role">
          <Select
            id="invite-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as ManagedUser["authRole"] })}
          >
            <option value="ADMIN">{copy.roleAdmin}</option>
            <option value="MANAGER">{copy.roleManager}</option>
            <option value="CONSULTANT">{copy.roleConsultant}</option>
          </Select>
        </Labeled>
        <Labeled label={copy.team} htmlFor="invite-team">
          <Select id="invite-team" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">{copy.noTeam}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Labeled>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {copy.cancel}
        </Button>
        <Button disabled={invite.isPending || !form.name || !form.email} onClick={() => invite.mutate()}>
          {copy.sendInvite}
        </Button>
      </div>
    </Dialog>
  );
}

function EditUserDialog({
  copy,
  user,
  teams,
  lastAdmin,
  onOpenChange,
  onDone,
  onConfirmRole,
}: {
  copy: SettingsCopy;
  user: ManagedUser | null;
  teams: Team[];
  lastAdmin: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  onConfirmRole: (role: ManagedUser["authRole"]) => void;
}) {
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    title: "",
    teamId: "",
    role: "CONSULTANT" as ManagedUser["authRole"],
  });
  React.useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      phone: user.phone || "",
      title: user.title || "",
      teamId: user.team?.id || user.teamId || "",
      role: user.authRole,
    });
  }, [user]);
  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("missing user");
      if (form.role !== user.authRole) {
        onConfirmRole(form.role);
        return Promise.resolve(user);
      }
      return usersApi.update(user.id, {
        name: form.name,
        phone: form.phone,
        title: form.title,
        teamId: form.teamId || null,
      });
    },
    onSuccess: () => {
      if (user && form.role === user.authRole) {
        toast.success(copy.userUpdated);
        onOpenChange(false);
        onDone();
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange} title={copy.editUser}>
      {user ? (
        <div className="space-y-3">
          <Labeled label={copy.name} htmlFor="edit-name">
            <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label={copy.email} htmlFor="edit-email">
            <Input id="edit-email" value={user.email} readOnly className="bg-muted" />
          </Labeled>
          <Labeled label={copy.phone} htmlFor="edit-phone">
            <Input id="edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Labeled>
          <Labeled label={copy.titleField} htmlFor="edit-title">
            <Input id="edit-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Labeled>
          <Labeled label={copy.team} htmlFor="edit-team">
            <Select id="edit-team" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">{copy.noTeam}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Labeled>
          <Labeled label={copy.function} htmlFor="edit-role">
            <Select
              id="edit-role"
              value={form.role}
              disabled={lastAdmin}
              onChange={(e) => setForm({ ...form, role: e.target.value as ManagedUser["authRole"] })}
            >
              <option value="ADMIN">{copy.roleAdmin}</option>
              <option value="MANAGER">{copy.roleManager}</option>
              <option value="CONSULTANT">{copy.roleConsultant}</option>
            </Select>
          </Labeled>
          {lastAdmin ? <p className="text-sm text-muted-foreground">{copy.lastAdmin}</p> : null}
          <p className="text-sm text-muted-foreground">
            {interpolate(copy.activeSessions, { count: user.activeSessions })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {copy.save}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function ConfirmDialog({
  copy,
  currentUserId,
  confirm,
  onClose,
  onDone,
}: {
  copy: SettingsCopy;
  currentUserId?: string;
  confirm:
    | {
        type: "deactivate" | "revoke" | "role" | "cancelInvite";
        user: ManagedUser;
        role?: ManagedUser["authRole"];
      }
    | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const run = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      if (confirm.type === "deactivate" || confirm.type === "cancelInvite") {
        return usersApi.deactivate(confirm.user.id);
      }
      if (confirm.type === "revoke") return usersApi.revokeSessions(confirm.user.id);
      return usersApi.update(confirm.user.id, { role: confirm.role });
    },
    onSuccess: () => {
      if (confirm?.type === "deactivate" || confirm?.type === "cancelInvite") {
        toast.success(copy.userDeactivated);
      } else if (confirm?.type === "revoke") toast.success(copy.sessionsRevoked);
      else toast.success(copy.userUpdated);
      onClose();
      onDone();
    },
    onError: (err: Error) => toast.error(err.message || copy.lastAdmin),
  });

  const title =
    confirm?.type === "deactivate" || confirm?.type === "cancelInvite"
      ? interpolate(copy.deactivateTitle, { name: confirm.user.name })
      : confirm?.type === "revoke"
        ? copy.revokeTitle
        : copy.confirmRoleChange;

  return (
    <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && onClose()} title={title}>
      {confirm?.type === "deactivate" || confirm?.type === "cancelInvite" ? (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{copy.deactivateHint}</p>
      ) : null}
      {confirm?.type === "revoke" && confirm.user.id === currentUserId ? (
        <p className="text-sm text-muted-foreground">{copy.revokeSelfHint}</p>
      ) : null}
      {confirm?.type === "role" && confirm.user.authRole === "ADMIN" ? (
        <p className="text-sm text-muted-foreground">{copy.confirmAdminDemotion}</p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button
          variant={
            confirm?.type === "deactivate" || confirm?.type === "cancelInvite"
              ? "destructive"
              : "default"
          }
          disabled={run.isPending}
          onClick={() => run.mutate()}
        >
          {confirm?.type === "deactivate"
            ? copy.deactivate
            : confirm?.type === "cancelInvite"
              ? copy.cancelInvite
              : copy.confirm}
        </Button>
      </div>
    </Dialog>
  );
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
