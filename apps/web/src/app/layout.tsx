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
    default: `${APP_NAME} — Rastreamento, Comunicação e Inteligência`,
    template: `%s | ${APP_NAME}`,
  },
  applicationName: APP_NAME,
  description: "Rastreamento, Comunicação e Inteligência para gestão comercial.",
  icons: {
    icon: [
      { url: "/brand/brainx-favicon.ico?v=1", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      ...[16, 32, 48, 192, 512].map((size) => ({
        url: `/brand/brainx-icon-${size}.png?v=1`,
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
    ],
    apple: [{ url: "/brand/brainx-icon-180.png?v=1", sizes: "180x180", type: "image/png" }],
  },
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
