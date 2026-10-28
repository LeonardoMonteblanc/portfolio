// src/app/(admin)/layout.tsx
import { Sidebar } from "@/ui/components/sidebar";
import { Header } from "@/ui/components/header";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar admin={admin} />
      <div className="lg:pl-64">
        <Header admin={admin} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
