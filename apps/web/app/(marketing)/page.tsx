import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `${SITE_NAME} | The Fantasy Walking RPG & Fitness App`;
const description =
  "Turn your runs and workouts into an RPG adventure. Track calories, conquer dungeons, level up your hunter, and join guilds in the ultimate fitness game.";

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
      "Awaken your inner hunter. Track runs, conquer dungeons, level up, and climb the elite rankings in this immersive fitness RPG system.",
    images: [DEFAULT_OG_IMAGE],
    creator: "@huntersystem",
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
