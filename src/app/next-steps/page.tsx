import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_POLICE_CONTACT } from "@/lib/site";
import { getMarketForZip } from "@/lib/trending/read";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "If you've been scammed" };

const FIRST_STEPS = [
  {
    situation: "You paid with a credit card, debit card, or bank transfer",
    action: "Call your bank or card company now, using the number on your card or statement. Ask them to stop or reverse the payment.",
  },
  {
    situation: "You paid with a gift card",
    action: "Contact the company that issued the card (the number is on the back or on its website). Tell them it was used in a scam, and keep the card and receipt.",
  },
  {
    situation: "You sent a wire transfer or used a payment app (Zelle, Venmo, Cash App, PayPal)",
    action: "Contact the wire service or app right away and ask them to reverse the transfer. Also call your bank.",
  },
  {
    situation: "You paid with cryptocurrency",
    action: "Contact the exchange or company you used to send it and ask them to stop the transaction.",
  },
  {
    situation: "You let someone into your computer or phone",
    action: "Disconnect it from the internet, update its security software and run a scan, and change your passwords from a different device.",
  },
  {
    situation: "You shared your Social Security number, bank login, or other personal details",
    action: "Go to IdentityTheft.gov for a step-by-step recovery plan, and change any passwords you shared.",
  },
];

export default function NextStepsPage({ searchParams }: PageProps<"/next-steps">) {
  return (
    <article className="max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">If you&apos;ve been scammed</h1>
        <p className="text-lg">
          It happens to careful people every day. Acting quickly gives you the best chance of getting money back.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">First, stop the money</h2>
        <ul className="space-y-4">
          {FIRST_STEPS.map((step) => (
            <li key={step.situation} className="rounded-md border-2 border-border p-4">
              <p className="font-bold">{step.situation}</p>
              <p>{step.action}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Then, report it</h2>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong>Local police:</strong> call{" "}
            <Suspense fallback={DEFAULT_POLICE_CONTACT}>
              <PoliceContact searchParams={searchParams} />
            </Suspense>
            . A police report can help with your bank or insurance.
          </li>
          <li>
            <strong>Federal Trade Commission:</strong>{" "}
            <a href="https://reportfraud.ftc.gov" className="underline" rel="noopener noreferrer">
              ReportFraud.ftc.gov
            </a>
          </li>
          <li>
            <strong>FBI, for scams that happened online:</strong>{" "}
            <a href="https://www.ic3.gov" className="underline" rel="noopener noreferrer">
              ic3.gov
            </a>
          </li>
          <li>
            <strong>Better Business Bureau Scam Tracker:</strong>{" "}
            <a href="https://www.bbb.org/scamtracker" className="underline" rel="noopener noreferrer">
              bbb.org/scamtracker
            </a>
          </li>
          <li>
            <strong>Your neighbors:</strong>{" "}
            <Link href="/report" className="underline">
              report it here
            </Link>{" "}
            so others nearby can watch for it.
          </li>
        </ul>
      </section>

      <p className="text-muted">
        Talking to someone you trust can help too. Scammers count on people feeling rushed or embarrassed.
      </p>
    </article>
  );
}

async function PoliceContact({ searchParams }: Pick<PageProps<"/next-steps">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);
  const market = viewer.kind === "located" ? await getMarketForZip(viewer.zip) : null;
  return <>{market?.police_contact || DEFAULT_POLICE_CONTACT}</>;
}
