import type { Metadata } from "next";
import { getTenantTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mining Asset Platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTenantTheme();

  const cssVars = {
    "--tenant-primary-color": theme.primaryColor,
    "--tenant-secondary-color": theme.secondaryColor,
    "--tenant-font-family": theme.fontFamily,
  } as React.CSSProperties;

  return (
    <html lang="en" style={cssVars}>
      <body>
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:bg-slate-900 dark:border-slate-800">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt={theme.name} className="h-8 w-8 rounded" />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {theme.name.charAt(0)}
            </div>
          )}
          <span className="font-tenant text-lg font-semibold" style={{ color: theme.primaryColor }}>
            {theme.name}
          </span>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
