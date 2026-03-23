import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingBodyClass,
  marketingContainerClass,
  marketingLeadClass,
  marketingMainClass,
  marketingSectionTitleClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";

const title = `FAQ | ${SITE_NAME} - Gamified Fitness App Questions`;
const description =
  "Frequently asked questions about Group Leveling, the gamified walking and RPG fitness app. Learn how the step tracker and leveling system works.";

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
    a: "Group Leveling is an independent gamified fitness RPG: your real-world activity (steps, workouts, nutrition logging) fuels progression for your hunter.",
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
    <main className={marketingMainClass}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>Fitness App FAQ</h1>
        <p className={marketingLeadClass}>
          Straight answers about the app. We&apos;re an{" "}
          <strong className="font-semibold text-slate-200">independent</strong> RPG fitness
          app.
        </p>
        <dl className="mt-10 space-y-8">
          {faqs.map((item) => (
            <div key={item.q} className="border-b border-white/10 pb-8">
              <dt className={marketingSectionTitleClass}>{item.q}</dt>
              <dd className={`mt-3 ${marketingBodyClass}`}>{item.a}</dd>
            </div>
          ))}
        </dl>
        <MarketingSubfooter />
      </div>
    </main>
  );
}
