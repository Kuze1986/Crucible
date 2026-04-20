import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminLoginForm } from "@/components/crucible/admin-login-form";
import { adminCookieName, verifyAdminSessionToken } from "@/lib/admin/token";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const jar = await cookies();
  if (verifyAdminSessionToken(jar.get(adminCookieName)?.value)) {
    redirect("/admin");
  }

  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
