import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `${SITE_NAME} | RPG Fitness App & Walking Game.`;
const description =
  "Experience leveling up in real life with Group Leveling. Turn your daily steps into an RPG quest walking adventure with manhwa-style calorie tracking and fitness rewards.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} fantasy walking RPG and fitness app`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Experience leveling up in real life with Group Leveling. Turn your daily steps into an RPG quest walking adventure with manhwa-style calorie tracking and fitness rewards.",
    images: [DEFAULT_OG_IMAGE],
    creator: "@huntersystem",
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
