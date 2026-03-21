import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingBodyClass,
  marketingContainerClass,
  marketingMainClass,
  marketingMutedClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";

const title = `Privacy Policy | ${SITE_NAME}`;
const description =
  "How Group Leveling collects and uses fitness data, email, and account information. We do not sell your personal data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/privacy-policy",
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

export default function PrivacyPage() {
  return (
    <main className={marketingMainClass}>
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>Privacy Policy</h1>
        <p className={`mt-4 ${marketingMutedClass}`}>Last updated: March 12, 2026</p>
        <p className={`mt-6 ${marketingBodyClass}`}>
          We take your privacy seriously. Group Leveling collects fitness data (steps,
          distance) and email addresses to provide our RPG services. We do not sell your
          data to third parties.
        </p>
        <MarketingSubfooter />
      </div>
    </main>
  );
}
