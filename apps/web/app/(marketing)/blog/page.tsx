import type { Metadata } from "next";
import Link from "next/link";
import {
  createPublicServerClient,
  formatSupabaseError,
} from "@/utils/supabase/public-server";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `Blog | ${SITE_NAME}`;
const description =
  "Updates, fitness RPG tips, and hunter fantasy walking app ideas from the Group Leveling team.";

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
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-tight text-white md:text-4xl">
          Blog
        </h1>
        <p className="mt-3 text-slate-400">
          Notes from the team on turning real steps and workouts into a fantasy RPG
          progression loop.
        </p>

        {list.length === 0 ? (
          <p className="mt-10 text-slate-500">No posts yet. Check back soon.</p>
        ) : (
          <ul className="mt-10 space-y-6">
            {list.map((post) => (
              <li
                key={post.slug}
                className="border-b border-white/10 pb-6 last:border-0"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block text-lg font-bold text-white hover:text-cyan-300"
                >
                  {post.title}
                </Link>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-slate-400">{post.excerpt}</p>
                )}
                {post.published_at && (
                  <p className="mt-2 text-xs text-slate-600">
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
      </div>
    </main>
  );
}
