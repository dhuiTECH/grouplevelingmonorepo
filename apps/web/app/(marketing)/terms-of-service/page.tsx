import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `Terms of Service | ${SITE_NAME}`;
const description =
  "Terms of use for Group Leveling, including fair fitness tracking and account conduct.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms-of-service" },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/terms-of-service",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-20 text-sm">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p>
        By using the Group Leveling app, you agree to track your fitness fairly. Any
        manipulation of step data or GPS spoofing is grounds for account suspension.
      </p>
    </div>
  );
}
