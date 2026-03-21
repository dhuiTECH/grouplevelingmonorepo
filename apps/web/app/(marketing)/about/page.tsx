import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Group Leveling",
  description:
    "Group Leveling is an independent fantasy walking RPG and fitness app. Learn our mission, mechanics, and how we differ from official Solo Leveling games.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-tight text-white md:text-4xl">
          About
        </h1>
        <p className="mt-4 text-slate-400">
          Who we are, what we ship, and where we sit in hunter fantasy fitness as
          an <strong className="text-slate-200">independent</strong> product.
        </p>

        <div className="mt-10 space-y-10 border-t border-white/10 pt-10">
          <section className="border-b border-white/10 pb-10">
            <h2 className="text-lg font-bold text-cyan-300">Our mission</h2>
            <p className="mt-3 leading-relaxed text-slate-300">
              We turn real movement and meals into an RPG you actually want to open
              every day: quests, guild energy, and tools that make nutrition logging
              less of a chore.
            </p>
          </section>

          <section className="border-b border-white/10 pb-10">
            <h2 className="text-lg font-bold text-cyan-300">
              Solo Leveling &amp; third-party IP
            </h2>
            <p className="mt-3 leading-relaxed text-slate-300">
              We are{" "}
              <strong className="text-slate-200">not</strong> affiliated with the Solo
              Leveling anime, manhwa, or licensed games. We&apos;re a separate product for
              anyone who likes that vibe and wants progression they earn outside the
              screen.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            ← Home
          </Link>
          {" · "}
          <Link href="/features" className="text-cyan-400 hover:text-cyan-300">
            Features
          </Link>
          {" · "}
          <Link href="/blog" className="text-cyan-400 hover:text-cyan-300">
            Blog
          </Link>
          {" · "}
          <Link href="/faq" className="text-cyan-400 hover:text-cyan-300">
            FAQ
          </Link>
          {" · "}
          <Link href="/join" className="text-cyan-400 hover:text-cyan-300">
            Join
          </Link>
        </p>
      </div>
    </main>
  );
}
