import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
