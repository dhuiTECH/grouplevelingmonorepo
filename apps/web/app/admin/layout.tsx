import type { Metadata } from "next";
import { AdminToaster } from "@/components/admin/AdminToaster";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminToaster />
    </>
  );
}
