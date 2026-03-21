import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset forge",
  robots: { index: false, follow: false },
};

export default function AssetForgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
