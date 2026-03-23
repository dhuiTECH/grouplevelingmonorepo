import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingBodyClass,
  marketingContainerClass,
  marketingDividerClass,
  marketingLeadClass,
  marketingMainClass,
  marketingSectionTitleClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";

const title = `About | ${SITE_NAME} - Gamified Walking & Fitness App`;
const description =
  "Group Leveling is an independent RPG fitness app and gamified step tracker. Learn our mission, mechanics, and how we turn your workouts into real-world leveling.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title,
    description,
    url: "/about",
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

export default function AboutPage() {
  return (
    <main className={marketingMainClass}>
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>About Group Leveling</h1>
        <p className={marketingLeadClass}>
          Who we are, what we ship, and how we fit into hunter-fantasy fitness as an{" "}
          <strong className="font-semibold text-slate-200">independent</strong> product
          (not affiliated with the Solo Leveling anime, games, or brand).
        </p>

        <div className={`${marketingDividerClass} space-y-10`}>
          <section className="border-b border-white/10 pb-10">
            <h2 className={marketingSectionTitleClass}>
              Our Mission: Your Real Life, Levelled Up
            </h2>
            <p className={`mt-3 font-semibold text-cyan-400/90 ${marketingBodyClass}`}>
              Why settle for a basic step tracker when you can explore a fantasy world?
            </p>
            <p className={`mt-4 ${marketingBodyClass}`}>
              Group Leveling is a walking game built to make you the main character of your
              own RPG fitness journey. We turn your daily walks into world-traveling
              adventures and your meals into &quot;Mana&quot; through our all-in-one
              fitness and calorie tracker.
            </p>
            <p className={`mt-4 ${marketingBodyClass}`}>
              Our mission is to provide the ultimate &quot;System&quot; you need to stop
              just working out and start winning in real life. Whether you&rsquo;re a
              casual walker or a hardcore grinder, we&rsquo;re here to help you turn every
              real-world action into legendary progress.
            </p>
          </section>

          <section className="border-b border-white/10 pb-10">
            <h2 className={marketingSectionTitleClass}>Third-party IP</h2>
            <p className={`mt-3 ${marketingBodyClass}`}>
              We are <strong className="font-semibold text-slate-200">not</strong>{" "}
              affiliated with the Solo Leveling anime, manhwa, or licensed games.
              We&apos;re a separate product for anyone who likes that vibe and wants
              progression they earn outside the screen.
            </p>
          </section>
        </div>

        <MarketingSubfooter />
      </div>
    </main>
  );
}
