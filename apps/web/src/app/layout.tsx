import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { APP_NAME } from "@xingyu/config";
import { Providers } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: "CRM operacional da Xingyu — comercial, atendimento e recompra.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fontSans.variable} font-sans`}
        // Browser extensions can inject bis_register/__processed_* before React hydrates.
        // The server HTML and a clean Chromium DOM are otherwise byte-for-byte equivalent.
        suppressHydrationWarning
      >
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
