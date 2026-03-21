import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: auth.status ?? 401 },
    );
  }

  const { data: posts, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("admin blog list", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: auth.status ?? 401 },
    );
  }

  const payload = await request.json();
  const {
    slug,
    title,
    excerpt,
    body: markdownBody,
    meta_description,
    og_image,
    published,
    published_at,
  } = payload;

  if (!slug || typeof slug !== "string" || !title || typeof title !== "string") {
    return NextResponse.json(
      { error: "slug and title are required" },
      { status: 400 },
    );
  }

  const row = {
    slug: slug.trim(),
    title: title.trim(),
    excerpt: excerpt?.trim() || null,
    body: typeof markdownBody === "string" ? markdownBody : "",
    meta_description: meta_description?.trim() || null,
    og_image: og_image?.trim() || null,
    published: Boolean(published),
    published_at: published_at || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("admin blog insert", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ post: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: auth.status ?? 401 },
    );
  }

  const payload = await request.json();
  const { id, ...rest } = payload;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof rest.slug === "string") updates.slug = rest.slug.trim();
  if (typeof rest.title === "string") updates.title = rest.title.trim();
  if (rest.excerpt !== undefined)
    updates.excerpt = rest.excerpt?.trim() || null;
  if (typeof rest.body === "string") updates.body = rest.body;
  if (rest.meta_description !== undefined)
    updates.meta_description = rest.meta_description?.trim() || null;
  if (rest.og_image !== undefined)
    updates.og_image = rest.og_image?.trim() || null;
  if (typeof rest.published === "boolean") updates.published = rest.published;
  if (rest.published_at !== undefined) {
    const v = rest.published_at;
    updates.published_at =
      v && typeof v === "string" && v.trim() !== "" ? v : null;
  }

  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("admin blog update", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: auth.status ?? 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("admin blog delete", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
