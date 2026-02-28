import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { AlertBanner } from "@/components/AlertBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secretos De Campo",
  description: "Sistema de gestión para carnicería",
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoginPage = !session;

  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#92400e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Secretos De Campo" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen">
        <SessionProvider session={session}>
          {isLoginPage ? (
            children
          ) : (
            <div className="flex min-h-screen">
              <Sidebar
                userName={session.user?.name || "Usuario"}
                userRole={(session.user as { role?: string })?.role || "CASHIER"}
              />
              <main className="flex-1 overflow-auto pt-14 md:pt-0">
                <ToastProvider>
                  <AlertBanner />
                  {children}
                </ToastProvider>
              </main>
            </div>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
