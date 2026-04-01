import type { Metadata } from "next";
import { SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/site";

const title = `Join the waitlist | ${SITE_NAME}`;
const description =
  "iOS and Android coming soon. Join the email list for launch updates, a $20 bonus reward, and referral starter perks in Group Leveling.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Group Leveling waitlist",
    "fitness RPG signup",
    "walking RPG app",
    "referral bonus fitness app",
    "gamified fitness iOS",
    "gamified fitness Android",
  ],
  alternates: { canonical: "/join" },
  openGraph: {
    title,
    description,
    url: "/join",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — join the waitlist`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
