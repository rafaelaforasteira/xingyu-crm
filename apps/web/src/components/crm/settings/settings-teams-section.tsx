"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, Search, Cog, UserPlus, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { settingsApi, usersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { interpolate, type SettingsCopy } from "@/lib/settings-i18n";
import { roleLabel } from "@/lib/settings-format";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";
import { SettingsActionItem } from "./settings-action-menu";

const DESCRIPTION_MAX = 300;
const PREVIEW_LIMIT = 5;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function memberLabel(copy: SettingsCopy, count: number) {
  if (count <= 0) return copy.noMembers;
  if (count === 1) return copy.memberOne;
  return interpolate(copy.memberCount, { count });
}

export function SettingsTeamsSection({ copy }: { copy: SettingsCopy }) {
  const qc = useQueryClient();
  const teams = useQuery({
    queryKey: [...queryKeys.settings, "admin-teams"],
    queryFn: settingsApi.teams,
  });
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTeam, setEditTeam] = React.useState<Team | null>(null);
  const [membersTeam, setMembersTeam] = React.useState<{ team: Team; mode: "add" | "replace" } | null>(
    null,
  );
  const [archiveTeam, setArchiveTeam] = React.useState<Team | null>(null);

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: [...queryKeys.settings, "admin-teams"] }),
      qc.invalidateQueries({ queryKey: [...queryKeys.settings, "team-users"] }),
      qc.invalidateQueries({ queryKey: [...queryKeys.settings, "managed-users"] }),
    ]);

  const list = teams.data ?? [];

  return (
    <Card data-settings-block="teams" className="border-border/80 shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary/75" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.teams}
          </p>
        </div>
        <Button type="button" className="h-9 gap-1.5 px-3" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {copy.createTeam}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {teams.error ? <ErrorBanner message={copy.loadError} /> : null}
        {teams.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[7.5rem] w-full rounded-xl" />
            <Skeleton className="h-[7.5rem] w-full rounded-xl" />
          </div>
        ) : null}
        {!teams.isLoading && list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center">
            <UsersRound className="mx-auto h-5 w-5 text-primary/70" aria-hidden />
            <p className="mt-3 font-medium">{copy.emptyTeams}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.emptyTeamsHint}</p>
            <Button className="mt-4 h-9 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              {copy.createTeam}
            </Button>
          </div>
        ) : null}
        {list.map((team) => (
          <TeamCard
            key={team.id}
            copy={copy}
            team={team}
            onEdit={() => setEditTeam(team)}
            onAddMembers={() => setMembersTeam({ team, mode: "add" })}
            onManageMembers={() => setMembersTeam({ team, mode: "replace" })}
            onArchive={() => setArchiveTeam(team)}
          />
        ))}
      </CardContent>

      <TeamFormDialog
        copy={copy}
        open={createOpen}
        title={copy.createTeam}
        onOpenChange={setCreateOpen}
        onSubmit={async (values) => {
          await settingsApi.createTeam(values);
          toast.success(copy.teamCreatedSuccess);
          await invalidate();
        }}
      />
      <TeamFormDialog
        copy={copy}
        open={Boolean(editTeam)}
        title={copy.editTeam}
        initial={editTeam ?? undefined}
        onOpenChange={(open) => !open && setEditTeam(null)}
        onSubmit={async (values) => {
          if (!editTeam) return;
          await settingsApi.updateTeam(editTeam.id, values);
          toast.success(copy.teamUpdatedSuccess);
          await invalidate();
        }}
      />
      <MemberPickerDialog
        copy={copy}
        context={membersTeam}
        onOpenChange={(open) => !open && setMembersTeam(null)}
        onDone={invalidate}
      />
      <ArchiveTeamDialog
        copy={copy}
        team={archiveTeam}
        teams={list}
        onOpenChange={(open) => !open && setArchiveTeam(null)}
        onDone={invalidate}
      />
    </Card>
  );
}

function TeamCard({
  copy,
  team,
  onEdit,
  onAddMembers,
  onManageMembers,
  onArchive,
}: {
  copy: SettingsCopy;
  team: Team;
  onEdit: () => void;
  onAddMembers: () => void;
  onManageMembers: () => void;
  onArchive: () => void;
}) {
  const count = team.memberCount ?? team._count?.members ?? team.memberPreview?.length ?? 0;
  const preview = team.memberPreview ?? [];
  const extra = Math.max(0, count - Math.min(preview.length, PREVIEW_LIMIT));
  const empty = count === 0;
  const manageLabel = interpolate(copy.manageTeamNamed, { name: team.name });
  const addLabel = interpolate(copy.addMembersTo, { name: team.name });

  return (
    <article className="rounded-xl border border-border/70 p-4 transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-8 w-8 shrink-0 self-start items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UsersRound className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.95rem] font-semibold leading-snug text-foreground">{team.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {team.description?.trim() ? team.description : copy.noDescription}
          </p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">{memberLabel(copy, count)}</p>
            {!empty ? (
              <div className="flex items-center">
                {preview.slice(0, PREVIEW_LIMIT).map((member, index) => (
                  <span
                    key={member.id}
                    title={member.name}
                    className={cn(
                      "inline-flex rounded-full border-2 border-card",
                      index > 0 && "-ml-1.5",
                    )}
                  >
                    <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                  </span>
                ))}
                {extra > 0 ? (
                  <span className="-ml-1.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                    +{extra}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <TeamActionGroup
          copy={copy}
          manageLabel={manageLabel}
          addLabel={addLabel}
          onEdit={onEdit}
          onAddMembers={onAddMembers}
          onManageMembers={onManageMembers}
          onArchive={onArchive}
        />
      </div>
    </article>
  );
}

const teamIconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TeamActionGroup({
  copy,
  manageLabel,
  addLabel,
  onEdit,
  onAddMembers,
  onManageMembers,
  onArchive,
}: {
  copy: SettingsCopy;
  manageLabel: string;
  addLabel: string;
  onEdit: () => void;
  onAddMembers: () => void;
  onManageMembers: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex shrink-0 items-center gap-2" ref={ref}>
      <div className="relative">
        <button
          type="button"
          title={copy.manageTeam}
          aria-label={manageLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(teamIconButtonClass, open && "border-primary/30 bg-primary/10 text-primary")}
        >
          <Cog className="h-4 w-4" aria-hidden />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[210px] rounded-lg border bg-card p-1 shadow-soft"
          >
            <SettingsActionItem onClick={onEdit} onSelect={() => setOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {copy.editTeam}
              </span>
            </SettingsActionItem>
            <SettingsActionItem onClick={onManageMembers} onSelect={() => setOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {copy.manageMembers}
              </span>
            </SettingsActionItem>
            <div className="my-1 border-t border-border/70" />
            <SettingsActionItem destructive onClick={onArchive} onSelect={() => setOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Archive className="h-3.5 w-3.5" aria-hidden />
                {copy.archiveTeam}
              </span>
            </SettingsActionItem>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        title={copy.addMembers}
        aria-label={addLabel}
        onClick={onAddMembers}
        className={teamIconButtonClass}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function TeamFormDialog({
  copy,
  open,
  title,
  onOpenChange,
  onSubmit,
  initial,
}: {
  copy: SettingsCopy;
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; description?: string }) => Promise<void>;
  initial?: { name: string; description?: string | null };
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    window.setTimeout(() => nameRef.current?.focus(), 20);
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="team-name">{copy.teamName}</Label>
          <Input
            ref={nameRef}
            id="team-name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-desc">
            {copy.description} ({copy.optional})
          </Label>
          <textarea
            id="team-desc"
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {description.length} / {DESCRIPTION_MAX}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({
                  name: name.trim(),
                  description: description.trim() || undefined,
                });
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : copy.saveError);
              } finally {
                setSaving(false);
              }
            }}
          >
            {copy.save}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function MemberPickerDialog({
  copy,
  context,
  onOpenChange,
  onDone,
}: {
  copy: SettingsCopy;
  context: { team: Team; mode: "add" | "replace" } | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<unknown>;
}) {
  const open = Boolean(context);
  const team = context?.team;
  const mode = context?.mode ?? "add";
  const [search, setSearch] = React.useState("");
  const debounced = useDebouncedValue(search.trim(), 350);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const searchRef = React.useRef<HTMLInputElement>(null);

  const candidates = useQuery({
    queryKey: [...queryKeys.settings, "team-member-picker", { search: debounced }],
    queryFn: () => usersApi.list({ page: 1, pageSize: 80, search: debounced || undefined }),
    enabled: open,
  });

  React.useEffect(() => {
    if (!open || !team) return;
    setSearch("");
    const currentIds = new Set(
      (team.memberPreview ?? []).map((member) => member.id),
    );
    setSelected(mode === "replace" ? currentIds : new Set());
    window.setTimeout(() => searchRef.current?.focus(), 20);
  }, [open, team?.id, mode]);

  const rows = (candidates.data?.data ?? []).filter((user) => user.status !== "INACTIVE");
  const visible =
    mode === "add" ? rows.filter((user) => (user.team?.id ?? user.teamId) !== team?.id) : rows;

  const moving = visible.filter((user) => {
    if (!selected.has(user.id) || !team) return false;
    const current = user.team?.id ?? user.teamId;
    return Boolean(current) && current !== team.id;
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!team) return;
      const ids = [...selected];
      if (mode === "add") await settingsApi.addTeamMembers(team.id, ids);
      else await settingsApi.replaceTeamMembers(team.id, ids);
    },
    onSuccess: async () => {
      toast.success(copy.membersUpdated);
      onOpenChange(false);
      await onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!team) return null;

  const selectedCount = selected.size;
  const canSubmit = mode === "add" ? selectedCount > 0 : !save.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={
        mode === "add"
          ? interpolate(copy.addMembersTo, { name: team.name })
          : interpolate(copy.manageMembersOf, { name: team.name })
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            aria-label={copy.searchUserShort}
            placeholder={copy.searchUserShort}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {visible.map((user) => {
            const checked = selected.has(user.id);
            const currentTeam = user.team?.name;
            const currentId = user.team?.id ?? user.teamId;
            const willMove = Boolean(currentId) && currentId !== team.id && checked;
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="mt-1.5"
                  checked={checked}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(user.id)) next.delete(user.id);
                      else next.add(user.id);
                      return next;
                    });
                  }}
                />
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {roleLabel(user.authRole, copy)} · {currentTeam || copy.noTeam}
                  </span>
                  {willMove ? (
                    <span className="mt-0.5 block text-[11px] text-primary">
                      {interpolate(copy.moveFromTo, {
                        from: currentTeam || copy.noTeam,
                        to: team.name,
                      })}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{copy.emptyUsersFilter}</p>
          ) : null}
        </div>
        {moving.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {moving.length === 1
              ? interpolate(copy.moveNoticeOne, { name: team.name })
              : interpolate(copy.moveNotice, { count: moving.length, name: team.name })}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {selectedCount === 1
              ? copy.selectedOne
              : interpolate(copy.selectedCount, { count: selectedCount })}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || save.isPending || (mode === "add" && selectedCount === 0)}
              onClick={() => save.mutate()}
            >
              {mode === "add" ? copy.addMembers : copy.save}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function ArchiveTeamDialog({
  copy,
  team,
  teams,
  onOpenChange,
  onDone,
}: {
  copy: SettingsCopy;
  team: Team | null;
  teams: Team[];
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<unknown>;
}) {
  const count = team?.memberCount ?? team?._count?.members ?? 0;
  const [action, setAction] = React.useState<"detach" | "move">("detach");
  const [targetId, setTargetId] = React.useState("");

  React.useEffect(() => {
    setAction("detach");
    setTargetId("");
  }, [team?.id]);

  const archive = useMutation({
    mutationFn: () => {
      if (!team) throw new Error("missing team");
      return settingsApi.archiveTeam(team.id, {
        memberAction: count > 0 ? action : "detach",
        targetTeamId: action === "move" ? targetId : undefined,
      });
    },
    onSuccess: async () => {
      toast.success(copy.teamArchived);
      onOpenChange(false);
      await onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const destinations = teams.filter((item) => item.id !== team?.id);

  return (
    <Dialog
      open={Boolean(team)}
      onOpenChange={onOpenChange}
      title={team ? interpolate(copy.archiveTeamQuestion, { name: team.name }) : copy.archiveTeam}
    >
      {team ? (
        <div className="space-y-4">
          {count > 0 ? (
            <p className="text-sm text-muted-foreground">
              {interpolate(copy.archiveHasMembers, { count })}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{copy.archiveTeamBody}</p>
          {count > 0 ? (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="archive-action"
                  checked={action === "detach"}
                  onChange={() => setAction("detach")}
                  className="mt-1"
                />
                <span>{copy.archiveLeaveUnassigned}</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="archive-action"
                  checked={action === "move"}
                  onChange={() => setAction("move")}
                  className="mt-1"
                />
                <span>{copy.archiveMoveMembers}</span>
              </label>
              {action === "move" ? (
                <Select
                  aria-label={copy.archiveSelectTeam}
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">{copy.archiveSelectTeam}</option>
                  {destinations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={archive.isPending || (count > 0 && action === "move" && !targetId)}
              onClick={() => archive.mutate()}
            >
              {copy.archiveTeam}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
