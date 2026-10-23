import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{SITE_NAME}</h1>
      <p className="text-lg text-muted">{SITE_DESCRIPTION}</p>
      <p>The local feed is coming soon.</p>
    </section>
  );
}
