"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usersApi } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";

export default function AcceptInvitePage() {
  return (
    <React.Suspense fallback={<main className="min-h-dvh bg-background" />}>
      <AcceptInviteContent />
    </React.Suspense>
  );
}

function AcceptInviteContent() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => usersApi.inspectInvite(token),
    enabled: Boolean(token),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => usersApi.acceptInvite(token, { password, confirmPassword }),
  });
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vinda à Xingyu CRM</CardTitle>
          <p className="text-sm text-muted-foreground">Ative sua conta e crie uma senha segura.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite.error ? (
            <p className="text-sm text-destructive">{(invite.error as Error).message}</p>
          ) : null}
          {invite.data ? (
            <>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{invite.data.name}</p>
                <p className="text-muted-foreground">{invite.data.email}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="invite-password">Senha</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="invite-confirm">Confirmar senha</Label>
                <Input
                  id="invite-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {accept.error ? (
                <p className="text-sm text-destructive">{(accept.error as Error).message}</p>
              ) : null}
              {accept.isSuccess ? (
                <>
                  <p className="text-sm text-emerald-600">Conta ativada com sucesso.</p>
                  <Link href="/login" className={buttonVariants({ className: "w-full" })}>
                    Entrar no CRM
                  </Link>
                </>
              ) : (
                <Button
                  className="w-full"
                  disabled={
                    accept.isPending || password.length < 12 || password !== confirmPassword
                  }
                  onClick={() => accept.mutate()}
                >
                  {accept.isPending ? "Ativando…" : "Ativar minha conta"}
                </Button>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
