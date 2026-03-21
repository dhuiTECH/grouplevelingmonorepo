import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicServerClient } from "@/utils/supabase/public-server";
import BlogMarkdown from "@/components/blog/BlogMarkdown";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_description, og_image, excerpt")
    .eq("slug", slug)
    .maybeSingle();

  if (!post) {
    return { title: "Post not found | Group Leveling" };
  }

  const description =
    post.meta_description || post.excerpt || "Group Leveling blog post.";

  return {
    title: `${post.title} | Group Leveling`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      ...(post.og_image ? { images: [{ url: post.og_image }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white md:px-8 md:py-14">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          ← All posts
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-orbitron)] text-3xl font-black leading-tight tracking-tight md:text-4xl">
          {post.title}
        </h1>
        {post.published_at && (
          <p className="mt-3 text-sm text-slate-500">
            {new Date(post.published_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
        {post.excerpt && (
          <p className="mt-6 text-lg text-slate-300">{post.excerpt}</p>
        )}
        <div className="mt-10 border-t border-white/10 pt-10">
          <BlogMarkdown content={post.body || ""} />
        </div>
      </article>
    </main>
  );
}
