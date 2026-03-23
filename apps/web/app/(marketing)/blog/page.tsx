import type { Metadata } from "next";
import Link from "next/link";
import {
  createPublicServerClient,
  formatSupabaseError,
} from "@/utils/supabase/public-server";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingContainerClass,
  marketingDividerClass,
  marketingLeadClass,
  marketingMainClass,
  marketingMutedClass,
  marketingSmallClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";

const title = `Blog | ${SITE_NAME} - RPG Fitness News`;
const description =
  "Updates, fitness RPG tips, and launch news from the Group Leveling team. Learn how to level up in real life.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: {
    title,
    description,
    url: "/blog",
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

export const revalidate = 120;

export default async function BlogIndexPage() {
  const supabase = createPublicServerClient();
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, published_at, meta_description")
    .order("published_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("blog list", formatSupabaseError(error));
    }
  }

  const list = error ? [] : (posts ?? []);

  return (
    <main className={marketingMainClass}>
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>Hunter System Blog</h1>
        <p className={marketingLeadClass}>
          Updates from the team: how we turn steps, workouts, and meals into an RPG
          progression fitness app.
        </p>

        {list.length === 0 ? (
          <p className={`${marketingDividerClass} ${marketingMutedClass}`}>
            No posts yet. Check back soon.
          </p>
        ) : (
          <ul className={`${marketingDividerClass} space-y-6`}>
            {list.map((post) => (
              <li
                key={post.slug}
                className="border-b border-white/10 pb-6 last:border-0"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-lg font-bold text-white transition-colors hover:text-cyan-300"
                >
                  {post.title}
                </Link>
                {post.excerpt && (
                  <p className={`mt-2 ${marketingSmallClass}`}>{post.excerpt}</p>
                )}
                {post.published_at && (
                  <p className={`mt-2 ${marketingMutedClass}`}>
                    {new Date(post.published_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <MarketingSubfooter />
      </div>
    </main>
  );
}
