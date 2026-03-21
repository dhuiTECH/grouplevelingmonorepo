import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `FAQ | ${SITE_NAME}`;
const description =
  "Frequently asked questions about Group Leveling, the fantasy walking RPG and fitness app. Independent product, not affiliated with Solo Leveling anime or games.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title,
    description,
    url: "/faq",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
};

const faqs = [
  {
    q: "What is Group Leveling?",
    a: "Group Leveling is an independent gamified fitness RPG: your real-world activity (steps, workouts, nutrition logging) fuels progression for your hero. It is not affiliated with the Solo Leveling anime, manhwa, or official games.",
  },
  {
    q: "Is Group Leveling related to Solo Leveling?",
    a: "No. We are fans of hunter-fantasy and dungeon-RPG vibes, but Group Leveling is a separate fitness product. Any mention of similar themes is for genre comparison only.",
  },
  {
    q: "How does the RPG progression work?",
    a: "You earn rewards like XP and gold from tracked activity and goals. Details shift as we ship updates; after you join, the in-app guides are the source of truth.",
  },
  {
    q: "Do you sell my fitness data?",
    a: "We do not sell your personal fitness data. See our Privacy Policy for details on what we collect and why.",
  },
  {
    q: "Where can I get the app?",
    a: "Use the Join / waitlist flow on our homepage or follow links from official Group Leveling channels when available.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-tight md:text-4xl">
          FAQ
        </h1>
        <p className="mt-4 text-slate-400">
          Straight answers about the app. We&apos;re an{" "}
          <strong className="text-slate-200">independent</strong> fitness RPG, not
          the official Solo Leveling brand.
        </p>
        <dl className="mt-10 space-y-8">
          {faqs.map((item) => (
            <div key={item.q} className="border-b border-white/10 pb-8">
              <dt className="text-lg font-bold text-cyan-300">{item.q}</dt>
              <dd className="mt-3 text-slate-300 leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
