import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminSignOut } from "@/components/crucible/admin-sign-out";
import { AdminSwitchMode } from "@/components/crucible/admin-switch-mode";
import { buttonVariants } from "@/components/ui/button";
import { adminCookieName, verifyAdminSessionToken } from "@/lib/admin/token";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const jar = await cookies();
  if (!verifyAdminSessionToken(jar.get(adminCookieName)?.value)) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold tracking-tight">Operator console</h1>
          <p className="text-sm text-muted-foreground">Signed in with admin password.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminSwitchMode />
          <AdminSignOut />
        </div>
      </header>
      <ul className="space-y-3 text-sm text-muted-foreground">
        <li>
          <Link className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-indigo-400")} href="/dashboard">
            Open Command Center (requires app sign-in)
          </Link>
        </li>
        <li>
          <Link className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-indigo-400")} href="/settings">
            Settings
          </Link>
        </li>
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">
        Admin session is separate from Supabase app auth. Set <code className="text-indigo-300">ADMIN_PASSWORD</code>{" "}
        in production.
      </p>
    </div>
  );
}
