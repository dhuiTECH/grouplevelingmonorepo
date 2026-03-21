import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Re-awaken",
  robots: { index: false, follow: false },
};

export default function ReAwakenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
