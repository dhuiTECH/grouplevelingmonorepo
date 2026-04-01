import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Class selection",
  robots: { index: false, follow: false },
};

export default function ClassSelectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
