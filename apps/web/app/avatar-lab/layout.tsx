import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Avatar lab",
  robots: { index: false, follow: false },
};

export default function AvatarLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
