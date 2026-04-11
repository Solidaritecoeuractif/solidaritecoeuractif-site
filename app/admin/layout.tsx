import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    redirect("/admin/login");
  }

  return (
    <main className="admin-wrap">
      <AdminNav />
      {children}
    </main>
  );
}