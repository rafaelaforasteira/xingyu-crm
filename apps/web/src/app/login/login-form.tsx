"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ApiError } from "@/lib/api";
import { DEFAULT_APP_HOME } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Globe } from "@/components/ui/globe";
import styles from "./login.module.css";

export function LoginForm() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : DEFAULT_APP_HOME);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : DEFAULT_APP_HOME);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? "Não foi possível entrar. Verifique suas credenciais e tente novamente."
          : "Não foi possível entrar. Tente novamente.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || isAuthenticated) {
    return <div className={styles.loading}>Carregando…</div>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.visual} aria-hidden="true">
        <Globe className={styles.globe} />
      </div>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <Image src="/brand/brainx-mark.png" alt="BRAINX" width={92} height={92} priority />
        </div>
        <div className={styles.heading}>
          <h1 id="login-title">Bem-vindo ao BRAINX</h1>
          <p>Acesse sua central de rastreamento, comunicação e inteligência.</p>
        </div>

        <form className={"space-y-4 " + styles.form} onSubmit={onSubmit} noValidate>
          <div className="space-y-1.5">
            <Input
              id="email"
              name="email"
              aria-label="E-mail"
              placeholder="E-mail"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Input
                id="password"
                name="password"
                aria-label="Senha"
                placeholder="Senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="pr-10"
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className={
                  "absolute inset-y-0 right-0 flex items-center px-3 " + styles.passwordToggle
                }
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className={"rounded-lg px-3 py-2 text-sm " + styles.error}>
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className={"w-full " + styles.submit}
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </section>
    </main>
  );
}
