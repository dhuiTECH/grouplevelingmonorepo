"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links: { href: string; label: string; match?: "exact" | "prefix" }[] = [
  { href: "/", label: "Home", match: "exact" },
  { href: "/features", label: "Features", match: "exact" },
  { href: "/blog", label: "Blog", match: "prefix" },
  { href: "/faq", label: "FAQ", match: "exact" },
  { href: "/about", label: "About", match: "exact" },
  { href: "/join", label: "Join", match: "exact" },
];

function isActive(
  pathname: string,
  href: string,
  match: "exact" | "prefix" | undefined,
) {
  if (match === "prefix") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  highlight,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative px-2 py-2 md:px-3 md:py-2 text-sm font-bold tracking-wide transition-colors ${
        highlight
          ? "text-cyan-300 hover:text-cyan-200"
          : active
            ? "text-white"
            : "text-white/85 hover:text-white"
      }`}
    >
      <span className="relative z-10">{label}</span>
      <span
        className={`pointer-events-none absolute bottom-0 left-2 right-2 h-[3px] rounded-sm transition-all duration-300 md:left-3 md:right-3 ${
          active
            ? "opacity-100 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(34,211,238,0.85),0_0_20px_rgba(99,102,241,0.45)]"
            : "opacity-0 group-hover:opacity-100 bg-gradient-to-r from-cyan-500/90 via-sky-500/80 to-indigo-500/90 shadow-[0_0_10px_rgba(34,211,238,0.55),0_0_16px_rgba(99,102,241,0.35)]"
        }`}
        aria-hidden
      />
    </Link>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-black/95 backdrop-blur-md">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2 md:px-6 md:py-3">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 z-[101]">
          <div className="relative w-[34px] h-[34px] md:w-[42px] md:h-[42px]">
            <Image
              src="/website/groupleveling-logo.png"
              alt="Logo"
              fill
              className="object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            />
          </div>
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map(({ href, label, match }) => (
            <NavLink
              key={href + label}
              href={href}
              label={label}
              active={isActive(pathname, href, match)}
              highlight={label === "Join"}
            />
          ))}
        </nav>

        {/* Right: Mobile Hamburger Button */}
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-white/10 bg-black px-4 pb-4 pt-2 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col">
            {links.map(({ href, label, match }) => (
              <NavLink
                key={href + label + "m"}
                href={href}
                label={label}
                active={isActive(pathname, href, match)}
                onNavigate={() => setOpen(false)}
                highlight={label === "Join"}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
