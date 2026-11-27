"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Camera,
  Clock3,
  Eye,
  EyeOff,
  Languages,
  Lock,
  Mail,
  Pencil,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError, settingsApi } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { queryKeys } from "@/lib/query-keys";
import { formatPhoneForDisplay } from "@/lib/format-phone-display";
import { joinDisplayName, splitDisplayName } from "@/lib/names";
import {
  composePhoneE164,
  detectPhoneDialCode,
  isValidProfilePhone,
  nationalPhoneDigits,
  PROFILE_PHONE_COUNTRIES,
} from "@/lib/profile-phone";
import {
  formatTimezoneLabel,
  formatTimezoneOption,
  localeLabel,
  roleLabel,
} from "@/lib/settings-format";
import type { SettingsCopy } from "@/lib/settings-i18n";
import type { SettingsProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
] as const;

const AVATAR_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

type ProfileForm = {
  firstName: string;
  lastName: string;
  phoneDial: string;
  phoneNational: string;
  locale: SettingsProfile["locale"];
  timezone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function formFromProfile(profile: SettingsProfile): ProfileForm {
  const { firstName, lastName } = splitDisplayName(profile.name);
  const dial = detectPhoneDialCode(profile.phone);
  return {
    firstName,
    lastName,
    phoneDial: dial,
    phoneNational: nationalPhoneDigits(profile.phone, dial),
    locale: profile.locale,
    timezone: profile.timezone,
  };
}

function isDirty(form: ProfileForm, profile: SettingsProfile): boolean {
  const baseline = formFromProfile(profile);
  return (
    form.firstName.trim() !== baseline.firstName ||
    form.lastName.trim() !== baseline.lastName ||
    form.phoneDial !== baseline.phoneDial ||
    form.phoneNational !== baseline.phoneNational ||
    form.locale !== baseline.locale ||
    form.timezone !== baseline.timezone
  );
}

const emptyPassword: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsProfileSection({
  copy,
  profile,
  loading,
  error,
  onSaved,
}: {
  copy: SettingsCopy;
  profile?: SettingsProfile;
  loading: boolean;
  error: boolean;
  onSaved: () => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [form, setForm] = React.useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phoneDial: "55",
    phoneNational: "",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
  });
  const [passwordForm, setPasswordForm] = React.useState<PasswordForm>(emptyPassword);
  const firstNameRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!profile || editing) return;
    setForm(formFromProfile(profile));
  }, [profile, editing]);

  React.useEffect(() => {
    if (editing) firstNameRef.current?.focus();
  }, [editing]);

  const save = useMutation({
    mutationFn: () => {
      const name = joinDisplayName(form.firstName, form.lastName);
      if (!name) throw new Error(copy.saveError);
      if (!isValidProfilePhone(form.phoneDial, form.phoneNational)) {
        throw new Error(copy.invalidPhone);
      }
      const phone = composePhoneE164(form.phoneDial, form.phoneNational);
      return settingsApi.updateProfile({
        name,
        phone: phone || "",
        locale: form.locale,
        timezone: form.timezone,
      });
    },
    onSuccess: async () => {
      toast.success(copy.saved);
      setEditing(false);
      setPhoneError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: [...queryKeys.settings, "profile"] }),
        onSaved(),
      ]);
    },
    onError: (err: Error) => {
      if (err.message === copy.invalidPhone) setPhoneError(copy.invalidPhone);
      toast.error(err.message || copy.saveError);
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => settingsApi.uploadAvatar(file),
    onSuccess: async () => {
      toast.success(copy.photoUpdated);
      await Promise.all([
        qc.invalidateQueries({ queryKey: [...queryKeys.settings, "profile"] }),
        onSaved(),
      ]);
    },
    onError: (err: Error) => toast.error(err.message || copy.photoUploadError),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      }),
    onSuccess: () => {
      toast.success(copy.passwordUpdated);
      resetPasswordLocal();
      setPasswordOpen(false);
    },
    onError: (err: Error) => {
      const message =
        err instanceof ApiError ? err.message : err.message || copy.passwordUpdateError;
      setPasswordError(message);
      toast.error(message);
    },
  });

  const resetPasswordLocal = () => {
    setPasswordForm(emptyPassword);
    setPasswordError(null);
    setShowPassword({ current: false, next: false, confirm: false });
  };

  const startEdit = () => {
    if (!profile) return;
    setForm(formFromProfile(profile));
    setPhoneError(null);
    setPasswordOpen(false);
    resetPasswordLocal();
    setEditing(true);
  };

  const cancelEdit = () => {
    if (profile) setForm(formFromProfile(profile));
    setPhoneError(null);
    setEditing(false);
  };

  const openPassword = () => {
    setEditing(false);
    if (profile) setForm(formFromProfile(profile));
    setPhoneError(null);
    resetPasswordLocal();
    setPasswordOpen(true);
  };

  const cancelPassword = () => {
    resetPasswordLocal();
    setPasswordOpen(false);
  };

  const onPickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!AVATAR_TYPES.has(file.type.toLowerCase())) {
      toast.error(copy.invalidPhoto);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(copy.photoTooLarge);
      return;
    }
    uploadAvatar.mutate(file);
  };

  const sector = profile?.team?.name ?? copy.noTeam;
  const roleLine = profile ? `${roleLabel(profile.authRole, copy)} · ${sector}` : "";

  const canSubmitPassword =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length >= 12 &&
    passwordForm.confirmPassword.length >= 12 &&
    passwordForm.newPassword === passwordForm.confirmPassword &&
    !changePassword.isPending;

  return (
    <Card data-settings-block="profile" className="border-border/80 shadow-none">
      <CardContent className="p-5 sm:p-6">
        {error ? <ErrorBanner message={copy.profileLoadError} /> : null}

        {loading || !profile ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-[4.5rem] w-[4.5rem] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <ProfileAvatarButton
                name={profile.name}
                src={profile.avatarUrl}
                label={copy.changePhoto}
                uploading={uploadAvatar.isPending}
                onPick={() => fileRef.current?.click()}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={(e) => {
                  onPickAvatar(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="min-w-0 flex-1 self-center">
                <h2 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                  <span className="break-words">{profile.name}</span>
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{roleLine}</p>
              </div>
              {!editing ? (
                <button
                  type="button"
                  aria-label={copy.editProfile}
                  title={copy.editProfile}
                  onClick={startEdit}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{copy.edit}</span>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="border-t border-border/60" />

            {editing ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label={copy.firstName} htmlFor="settings-first-name">
                    <Input
                      ref={firstNameRef}
                      id="settings-first-name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label={copy.lastName} htmlFor="settings-last-name">
                    <Input
                      id="settings-last-name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      autoComplete="family-name"
                    />
                  </Field>
                  <InfoCell icon={Mail} label={copy.email} hint={copy.accountEmailHint}>
                    <p className="break-all text-sm font-medium text-foreground">{profile.email}</p>
                  </InfoCell>
                  <Field label={copy.phone} htmlFor="settings-phone-national" error={phoneError}>
                    <div className="flex gap-2">
                      <Select
                        aria-label={copy.phone}
                        value={form.phoneDial}
                        className="w-[9.5rem] shrink-0"
                        onChange={(e) => setForm({ ...form, phoneDial: e.target.value })}
                      >
                        {PROFILE_PHONE_COUNTRIES.map((country) => (
                          <option key={country.dial} value={country.dial}>
                            {copy[country.labelKey]}
                          </option>
                        ))}
                      </Select>
                      <Input
                        id="settings-phone-national"
                        value={form.phoneNational}
                        onChange={(e) => {
                          setPhoneError(null);
                          setForm({ ...form, phoneNational: e.target.value });
                        }}
                        inputMode="tel"
                        autoComplete="tel-national"
                        className="min-w-0 flex-1"
                      />
                    </div>
                  </Field>
                  <InfoCell icon={Briefcase} label={copy.sector}>
                    <p className="text-sm font-medium text-foreground">{sector}</p>
                  </InfoCell>
                  <Field label={copy.language} htmlFor="settings-locale">
                    <Select
                      id="settings-locale"
                      value={form.locale}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          locale: e.target.value as SettingsProfile["locale"],
                        })
                      }
                    >
                      <option value="pt-BR">{copy.localePt}</option>
                      <option value="en">{copy.localeEn}</option>
                      <option value="zh-CN">{copy.localeZhCn}</option>
                      <option value="zh-HK">{copy.localeZhHk}</option>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label={copy.timezone} htmlFor="settings-timezone">
                      <Select
                        id="settings-timezone"
                        value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      >
                        {TIMEZONES.map((zone) => (
                          <option key={zone} value={zone}>
                            {formatTimezoneOption(zone)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={save.isPending}>
                    {copy.cancel}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!isValidProfilePhone(form.phoneDial, form.phoneNational)) {
                        setPhoneError(copy.invalidPhone);
                        toast.error(copy.invalidPhone);
                        return;
                      }
                      save.mutate();
                    }}
                    disabled={
                      save.isPending ||
                      !form.firstName.trim() ||
                      !profile ||
                      !isDirty(form, profile)
                    }
                  >
                    {save.isPending ? copy.saving : copy.save}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <dl
                  data-testid="settings-profile-grid"
                  className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <InfoCell icon={Mail} label={copy.email}>
                    <dd className="mt-0.5 break-all text-sm font-medium text-foreground">
                      {profile.email}
                    </dd>
                  </InfoCell>
                  <InfoCell icon={Phone} label={copy.phone}>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {profile.phone
                        ? formatPhoneForDisplay(profile.phone)
                        : copy.phoneMissing}
                    </dd>
                  </InfoCell>
                  <InfoCell icon={Lock} label={copy.passwordLabel}>
                    <dd className="mt-0.5">
                      <p className="text-sm font-medium tracking-widest text-foreground">
                        {copy.passwordMasked}
                      </p>
                      {!passwordOpen ? (
                        <button
                          type="button"
                          onClick={openPassword}
                          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {copy.resetPasswordAction}
                          <span aria-hidden>→</span>
                        </button>
                      ) : null}
                    </dd>
                  </InfoCell>
                  <InfoCell icon={Briefcase} label={copy.sector}>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">{sector}</dd>
                  </InfoCell>
                  <InfoCell icon={Clock3} label={copy.timezone}>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {formatTimezoneLabel(profile.timezone)}
                    </dd>
                  </InfoCell>
                  <InfoCell icon={Languages} label={copy.language}>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {localeLabel(profile.locale, copy)}
                    </dd>
                  </InfoCell>
                </dl>

                {passwordOpen ? (
                  <div
                    data-testid="settings-password-panel"
                    className="space-y-4 border-t border-border/60 pt-5"
                  >
                    <PasswordField
                      id="settings-current-password"
                      label={copy.currentPassword}
                      value={passwordForm.currentPassword}
                      visible={showPassword.current}
                      onToggle={() =>
                        setShowPassword({ ...showPassword, current: !showPassword.current })
                      }
                      onChange={(value) => {
                        setPasswordError(null);
                        setPasswordForm({ ...passwordForm, currentPassword: value });
                      }}
                      autoComplete="current-password"
                    />
                    <PasswordField
                      id="settings-new-password"
                      label={copy.newPassword}
                      value={passwordForm.newPassword}
                      visible={showPassword.next}
                      onToggle={() =>
                        setShowPassword({ ...showPassword, next: !showPassword.next })
                      }
                      onChange={(value) => {
                        setPasswordError(null);
                        setPasswordForm({ ...passwordForm, newPassword: value });
                      }}
                      autoComplete="new-password"
                    />
                    <PasswordField
                      id="settings-confirm-password"
                      label={copy.confirmPassword}
                      value={passwordForm.confirmPassword}
                      visible={showPassword.confirm}
                      onToggle={() =>
                        setShowPassword({ ...showPassword, confirm: !showPassword.confirm })
                      }
                      onChange={(value) => {
                        setPasswordError(null);
                        setPasswordForm({ ...passwordForm, confirmPassword: value });
                      }}
                      autoComplete="new-password"
                    />
                    {passwordError ? (
                      <p className="text-xs text-destructive" role="alert">
                        {passwordError}
                      </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={changePassword.isPending}
                        onClick={cancelPassword}
                      >
                        {copy.cancel}
                      </Button>
                      <Button
                        type="button"
                        disabled={!canSubmitPassword}
                        onClick={() => changePassword.mutate()}
                      >
                        {changePassword.isPending
                          ? copy.updatingPassword
                          : copy.updatePassword}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileAvatarButton({
  name,
  src,
  label,
  uploading,
  onPick,
}: {
  name: string;
  src?: string | null;
  label: string;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={uploading}
      onClick={onPick}
      className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar name={name} src={src} size="profile" />
      <span
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-foreground/55 text-primary-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100",
          uploading && "opacity-100",
        )}
      >
        <Camera className="h-4 w-4" />
        <span className="mt-0.5 max-w-[4.5rem] truncate px-1 text-[10px] font-medium leading-tight">
          {uploading ? "…" : label}
        </span>
      </span>
    </button>
  );
}

function InfoCell({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/65" aria-hidden />
        <span>{label}</span>
      </dt>
      {children}
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onToggle,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
