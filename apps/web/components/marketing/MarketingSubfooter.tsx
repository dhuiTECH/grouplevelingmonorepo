import Link from "next/link";
import { DownloadStoreButtons } from "./DownloadStoreButtons";

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/join", label: "Join" },
] as const;

export default function MarketingSubfooter() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DownloadStoreButtons />
      <p className="mt-12 text-sm text-slate-500">
        {links.map((item, i) => (
          <span key={item.href}>
            {i > 0 ? " · " : null}
            <Link href={item.href} className="text-cyan-400 hover:text-cyan-300">
              {item.label}
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}
