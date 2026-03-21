import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";

const BASE_URL = "https://www.groupleveling.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/features`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/join`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: posts, error } = await supabaseAdmin
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true);

    if (!error && posts?.length) {
      blogRoutes = posts.map((p) => ({
        url: `${BASE_URL}/blog/${p.slug}`,
        lastModified: p.updated_at
          ? new Date(p.updated_at)
          : p.published_at
            ? new Date(p.published_at)
            : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.65,
      }));
    }
  } catch {
    // Missing env or table — skip dynamic blog URLs
  }

  return [...staticRoutes, ...blogRoutes];
}
