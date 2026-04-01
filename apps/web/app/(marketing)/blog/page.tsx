import type { Metadata } from "next";
import Link from "next/link";
import {
  createPublicServerClient,
  formatSupabaseError,
} from "@/utils/supabase/public-server";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingWideClass,
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
    .select("slug, title, excerpt, published_at, meta_description, og_image")
    .order("published_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("blog list", formatSupabaseError(error));
    }
  }

  const list = error ? [] : (posts ?? []);

  return (
    <main className={marketingMainClass}>
      <div className={marketingWideClass}>
        <div className="max-w-3xl">
          <h1 className={marketingTitleClass}>Hunter System Blog</h1>
          <p className={marketingLeadClass}>
            Updates from the team: how we turn steps, workouts, and meals into an RPG
            progression fitness app.
          </p>
        </div>

        {list.length === 0 ? (
          <p className={`${marketingDividerClass} ${marketingMutedClass}`}>
            No posts yet. Check back soon.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {list.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/50 transition-all hover:border-cyan-500/50 hover:bg-black"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-gray-900/50">
                  {post.og_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={post.og_image} 
                      alt={post.title} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-cyan-900/20 text-cyan-500/30">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-1 flex-col p-6">
                  {post.published_at && (
                    <p className="mb-3 text-sm font-medium text-cyan-400">
                      {new Date(post.published_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  <h2 className="mb-2 text-xl font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mb-6 text-sm text-gray-400 line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                  )}
                  
                  <div className="mt-auto flex items-center text-sm font-semibold text-cyan-400">
                    Read Article
                    <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <MarketingSubfooter />
      </div>
    </main>
  );
}
