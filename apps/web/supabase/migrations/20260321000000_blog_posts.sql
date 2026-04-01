-- Blog posts for marketing site (public reads via RLS; writes via service role / admin API only)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL DEFAULT '',
  meta_description text,
  og_image text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_published_at_idx
  ON public.blog_posts (published, published_at DESC NULLS LAST);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated users: only published posts visible
CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts
  FOR SELECT
  USING (
    published = true
    AND (published_at IS NULL OR published_at <= now())
  );

COMMENT ON TABLE public.blog_posts IS 'Marketing blog; admin writes use service role (API), public reads use RLS.';
