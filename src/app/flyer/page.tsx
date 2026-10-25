import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import QRCode from "qrcode";
import { Logo } from "@/components/logo";
import { PUBLIC_SITE_URL, SITE_NAME, SITE_TAGLINE, SUPPORT_EMAIL } from "@/lib/site";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Flyer", robots: { index: false } };

async function qrSvg(url: string) {
  "use cache";
  cacheLife("max");
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
}

// Print-friendly flyer for the library, senior center, and local groups.
export default async function FlyerPage() {
  const svg = await qrSvg(PUBLIC_SITE_URL);
  const displayUrl = PUBLIC_SITE_URL.replace(/^https:\/\//, "");

  return (
    <article className="mx-auto max-w-xl space-y-6 rounded-lg bg-white p-6 text-black sm:p-8 print:max-w-none print:space-y-4 print:rounded-none print:p-0">
      <PrintButton />
      <header className="space-y-2 text-center">
        <h1>
          <Logo palette="print" title={SITE_NAME} className="mx-auto h-16 w-auto sm:h-20 print:h-20" />
        </h1>
        <p className="whitespace-nowrap text-xl font-bold sm:text-2xl">{SITE_TAGLINE}.</p>
      </header>

      <ul className="space-y-3 text-lg sm:text-xl print:space-y-2">
        <li>
          <strong>Got a strange text, call, or visit?</strong> Paste it in and see if neighbors reported the same thing.
        </li>
        <li>
          <strong>See what&apos;s going around</strong> in our area, with plain advice on what to do.
        </li>
        <li>
          <strong>Get a heads-up by email</strong> when a scam starts spreading nearby.
        </li>
      </ul>

      <div className="flex flex-col items-center gap-3 rounded-lg border-4 border-black p-4 sm:p-6 print:gap-2 print:p-4">
        <div
          className="w-56 sm:w-64 print:w-64 [&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label={`QR code for ${displayUrl}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-center text-xl font-bold break-all sm:text-2xl">{displayUrl}</p>
        <p className="text-lg">Scan with your phone&apos;s camera, or type the address.</p>
      </div>

      <p className="text-lg sm:text-xl">
        <strong>Free. No passwords.</strong> We hide phone numbers, names, and other personal details, and we never sell
        your information.
      </p>
      <p className="text-lg">
        A neighbor-run project. Not affiliated with the BBB, the FTC, or the police. Questions? {SUPPORT_EMAIL}
      </p>
    </article>
  );
}
