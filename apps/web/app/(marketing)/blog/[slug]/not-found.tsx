import Link from "next/link";

export default function BlogPostNotFound() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-center text-white">
      <h1 className="text-2xl font-bold">Post not found</h1>
      <Link href="/blog" className="mt-6 inline-block text-cyan-400 hover:text-cyan-300">
        ← Back to blog
      </Link>
    </main>
  );
}
