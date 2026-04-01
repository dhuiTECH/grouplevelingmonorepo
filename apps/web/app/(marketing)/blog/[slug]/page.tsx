import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicServerClient } from "@/utils/supabase/public-server";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingBodyClass,
  marketingContainerClass,
  marketingMainClass,
  marketingMutedClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_description, og_image, excerpt, published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!post) {
    return { title: `Post not found | ${SITE_NAME}`, robots: { index: false } };
  }

  const description =
    post.meta_description || post.excerpt || `${SITE_NAME} blog post.`;

  const ogImages = post.og_image
    ? [{ url: post.og_image }]
    : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: post.title }];

  const publishedTime = post.published_at
    ? new Date(post.published_at).toISOString()
    : undefined;

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${slug}`,
      siteName: SITE_NAME,
      locale: "en_US",
      publishedTime,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: ogImages.map((i) => i.url),
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

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.meta_description || undefined,
    datePublished: post.published_at
      ? new Date(post.published_at).toISOString()
      : undefined,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <main className={marketingMainClass}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className={marketingContainerClass}>
        <Link
          href="/blog"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 mb-6 inline-block"
        >
          &larr; All posts
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10 bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10">
          <div className="flex-1">
            <h1 className={marketingTitleClass}>{post.title}</h1>
            
            {post.published_at && (
              <p className={`mt-4 ${marketingMutedClass}`}>
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            
            {post.excerpt && (
              <p className={`mt-6 ${marketingBodyClass} text-lg leading-relaxed text-gray-300`}>
                {post.excerpt}
              </p>
            )}
          </div>
          
          {post.og_image && (
            <div className="w-full md:w-1/3 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg bg-black/50 aspect-video md:aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.og_image} 
                alt={post.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-10">
          <BlogMarkdown content={post.body || ""} />
        </div>
        <MarketingSubfooter />
      </article>
    </main>
  );
}
