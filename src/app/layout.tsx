import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SITE_DESCRIPTION, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="bg-surface shadow-sm print:hidden">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-4 px-4 py-3">
            <Link href="/" className="inline-flex min-h-12 items-center">
              <Logo className="h-9 w-auto" />
            </Link>
            <nav className="flex flex-wrap gap-x-4">
              <Link href="/check" className="inline-flex min-h-12 items-center underline">
                Check
              </Link>
              <Link href="/report" className="inline-flex min-h-12 items-center underline">
                Report
              </Link>
              <Link href="/settings" className="inline-flex min-h-12 items-center underline">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12 print:max-w-none print:p-0">
          <div className="rounded-2xl bg-surface p-5 shadow-sm sm:p-8 print:rounded-none print:bg-transparent print:p-0 print:shadow-none">
            {children}
          </div>
        </main>
        <footer className="mt-4 bg-footer print:hidden">
          <nav
            aria-label="About"
            className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 px-4 py-6 text-sm text-muted"
          >
            <Link href="/next-steps" className="inline-flex min-h-12 items-center underline-offset-4 hover:underline">
              If you&apos;ve been scammed
            </Link>
            <Link href="/rules" className="inline-flex min-h-12 items-center underline-offset-4 hover:underline">
              Community rules
            </Link>
            <Link href="/terms" className="inline-flex min-h-12 items-center underline-offset-4 hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="inline-flex min-h-12 items-center underline-offset-4 hover:underline">
              Privacy
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${SITE_NAME} feedback`)}`}
              className="inline-flex min-h-12 items-center underline-offset-4 hover:underline"
            >
              Send feedback
            </a>
          </nav>
        </footer>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
