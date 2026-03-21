"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
} from "lucide-react";
import type { BlogPostRow } from "@/lib/blog";
import { slugify } from "@/lib/blog";
import { adminAuthorizedFetch } from "@/lib/admin-authorized-fetch";

const emptyForm = {
  id: "" as string,
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  meta_description: "",
  og_image: "",
  published: false,
  published_at: "",
};

export default function BlogEditorTab() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const insertAtCursor = useCallback(
    (
      text: string,
      options?: { wrap?: { before: string; after: string }; block?: boolean }
    ) => {
      const el = bodyRef.current;
      if (!el) {
        setForm((f) => ({ ...f, body: f.body + text }));
        return;
      }

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const currentBody = form.body;
      const selectedText = currentBody.substring(start, end);

      let newContent = "";
      let newCursorPos = start;

      if (options?.wrap) {
        const wrapped = `${options.wrap.before}${selectedText || "text"}${options.wrap.after}`;
        newContent =
          currentBody.substring(0, start) +
          wrapped +
          currentBody.substring(end);
        newCursorPos = start + options.wrap.before.length;
      } else {
        const prefix = options?.block ? (start === 0 ? "" : "\n") : "";
        newContent =
          currentBody.substring(0, start) +
          prefix +
          text +
          currentBody.substring(end);
        newCursorPos = start + prefix.length + text.length;
      }

      setForm((f) => ({ ...f, body: newContent }));

      // Focus back and set cursor
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [form.body]
  );

  const handleFileUpload = async (
    file: File,
    type: "inline" | "hero"
  ) => {
    const isHero = type === "hero";
    if (isHero) setUploadingHero(true);
    else setUploadingInline(true);

    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", isHero ? "blog-posts/hero" : "blog-posts");

      const res = await adminAuthorizedFetch("/api/admin/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (isHero) {
        setForm((f) => ({ ...f, og_image: data.publicUrl }));
      } else {
        insertAtCursor(`![${file.name}](${data.publicUrl})\n`, { block: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      if (isHero) setUploadingHero(false);
      else setUploadingInline(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAuthorizedFetch("/api/admin/blog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPosts(data.posts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setForm({ ...emptyForm });
    setError(null);
  };

  const editPost = (p: BlogPostRow) => {
    setForm({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      body: p.body || "",
      meta_description: p.meta_description || "",
      og_image: p.og_image || "",
      published: p.published,
      published_at: p.published_at
        ? p.published_at.slice(0, 16)
        : "",
    });
    setError(null);
  };

  const save = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      setError("Slug and title required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        meta_description: form.meta_description.trim() || null,
        og_image: form.og_image.trim() || null,
        published: form.published,
        published_at: form.published_at
          ? new Date(form.published_at).toISOString()
          : null,
      };

      const isNew = !form.id;
      const res = await adminAuthorizedFetch("/api/admin/blog", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload : { id: form.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const saved = data.post as BlogPostRow;
      setForm({
        id: saved.id,
        slug: saved.slug,
        title: saved.title,
        excerpt: saved.excerpt || "",
        body: saved.body || "",
        meta_description: saved.meta_description || "",
        og_image: saved.og_image || "",
        published: saved.published,
        published_at: saved.published_at
          ? saved.published_at.slice(0, 16)
          : "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    setError(null);
    try {
      const res = await adminAuthorizedFetch(
        `/api/admin/blog?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (form.id === id) startNew();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400">
          Blog / marketing posts
        </h2>
        <button
          type="button"
          onClick={startNew}
          className="clip-tech-button flex items-center gap-2 bg-cyan-900 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800"
        >
          <Plus size={16} /> New post
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cyan-900/40 bg-black/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-200/80">
            All posts (drafts + published)
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-gray-500">No posts yet.</p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-2 rounded border border-white/10 bg-slate-950/80 p-2"
                >
                  <button
                    type="button"
                    onClick={() => editPost(p)}
                    className="min-w-0 flex-1 text-left hover:text-cyan-300"
                  >
                    <div className="truncate font-bold text-white">
                      {p.title}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      /{p.slug}{" "}
                      {p.published ? (
                        <span className="text-emerald-400">· live</span>
                      ) : (
                        <span className="text-amber-400">· draft</span>
                      )}
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {p.published && (
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-cyan-400 hover:text-cyan-300"
                        aria-label="View on site"
                      >
                        <ExternalLink size={16} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="p-1.5 text-red-400 hover:text-red-300"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-cyan-900/40 bg-black/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-200/80">
            Editor
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                Title
              </label>
              <input
                className="mt-1 w-full rounded border border-white/15 bg-black px-2 py-1.5 text-sm"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <button
                type="button"
                className="mt-1 text-[10px] text-cyan-500 hover:underline"
                onClick={() =>
                  setForm((f) => ({ ...f, slug: slugify(f.title) }))
                }
              >
                Generate slug from title
              </button>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                Slug (URL)
              </label>
              <input
                className="mt-1 w-full rounded border border-white/15 bg-black px-2 py-1.5 text-sm"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                Excerpt
              </label>
              <textarea
                className="mt-1 min-h-[60px] w-full rounded border border-white/15 bg-black px-2 py-1.5 text-sm"
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                Body (Markdown)
              </label>
              
              {/* Toolbar */}
              <div className="mt-1 flex flex-wrap items-center gap-1 rounded-t border border-white/15 bg-white/5 p-1">
                <button
                  type="button"
                  title="H1"
                  className="flex h-8 min-w-[2.25rem] items-center justify-center rounded px-1 hover:bg-white/10"
                  onClick={() => insertAtCursor("# ", { block: true })}
                >
                  <span className="text-sm font-black">H1</span>
                </button>
                <button
                  type="button"
                  title="H2"
                  className="flex h-8 min-w-[2.25rem] items-center justify-center rounded px-1 hover:bg-white/10"
                  onClick={() => insertAtCursor("## ", { block: true })}
                >
                  <span className="text-sm font-black">H2</span>
                </button>
                <button
                  type="button"
                  title="H3"
                  className="flex h-8 min-w-[2.25rem] items-center justify-center rounded px-1 hover:bg-white/10"
                  onClick={() => insertAtCursor("### ", { block: true })}
                >
                  <span className="text-sm font-black">H3</span>
                </button>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <button
                  type="button"
                  title="Bold"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
                  onClick={() =>
                    insertAtCursor("", { wrap: { before: "**", after: "**" } })
                  }
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  title="Italic"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
                  onClick={() =>
                    insertAtCursor("", { wrap: { before: "*", after: "*" } })
                  }
                >
                  <Italic size={14} />
                </button>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <button
                  type="button"
                  title="Bullet List"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
                  onClick={() => insertAtCursor("- ", { block: true })}
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
                  onClick={() => insertAtCursor("1. ", { block: true })}
                >
                  <ListOrdered size={14} />
                </button>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <button
                  type="button"
                  title="Insert Link"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10"
                  onClick={() =>
                    insertAtCursor("", { wrap: { before: "[", after: "](url)" } })
                  }
                >
                  <LinkIcon size={14} />
                </button>
                <button
                  type="button"
                  disabled={uploadingInline}
                  title="Insert Image"
                  className="flex h-7 w-8 items-center justify-center rounded hover:bg-white/10 disabled:opacity-50"
                  onClick={() => inlineFileRef.current?.click()}
                >
                  {uploadingInline ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImageIcon size={14} />
                  )}
                </button>
                <input
                  ref={inlineFileRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "inline");
                    e.target.value = "";
                  }}
                />
              </div>

              <textarea
                ref={bodyRef}
                className="w-full rounded-b border border-t-0 border-white/15 bg-black px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                style={{ minHeight: "300px" }}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                Meta description (SEO)
              </label>
              <input
                className="mt-1 w-full rounded border border-white/15 bg-black px-2 py-1.5 text-sm"
                value={form.meta_description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meta_description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500">
                OG image URL (Hero banner)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 rounded border border-white/15 bg-black px-2 py-1.5 text-sm"
                  value={form.og_image}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, og_image: e.target.value }))
                  }
                  placeholder="https://... or upload →"
                />
                <button
                  type="button"
                  disabled={uploadingHero}
                  className="flex h-9 items-center gap-2 rounded border border-white/15 bg-white/5 px-3 text-[10px] font-bold uppercase hover:bg-white/10 disabled:opacity-50"
                  onClick={() => heroFileRef.current?.click()}
                >
                  {uploadingHero ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  Upload
                </button>
                <input
                  ref={heroFileRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "hero");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published: e.target.checked }))
                  }
                />
                Published
              </label>
              <div>
                <label className="block text-[10px] uppercase text-gray-500">
                  Publish date
                </label>
                <input
                  type="datetime-local"
                  className="mt-1 rounded border border-white/15 bg-black px-2 py-1 text-sm"
                  value={form.published_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published_at: e.target.value }))
                  }
                />
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="clip-tech-button flex w-full items-center justify-center gap-2 bg-cyan-700 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {form.id ? "Update post" : "Create post"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
