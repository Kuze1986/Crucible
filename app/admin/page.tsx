import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminSignOut } from "@/components/crucible/admin-sign-out";
import { AdminSwitchMode } from "@/components/crucible/admin-switch-mode";
import { AdminStats } from "@/components/crucible/admin-stats";
import { buttonVariants } from "@/components/ui/button";
import { adminCookieName, verifyAdminSessionToken } from "@/lib/admin/token";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const jar = await cookies();
  if (!verifyAdminSessionToken(jar.get(adminCookieName)?.value)) {
    redirect("/admin/login");
  }

  const db = createServiceSupabaseCrucible();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: runsToday },
    { count: runsWeek },
    { count: runsMonth },
    { count: runsActive },
    { data: recentRuns },
    { data: topUsersRaw },
  ] = await Promise.all([
    db.from("simulation_runs").select("id", { count: "exact", head: true }).gte("created_at", startOfToday),
    db.from("simulation_runs").select("id", { count: "exact", head: true }).gte("created_at", startOfWeek),
    db.from("simulation_runs").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
    db.from("simulation_runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
    db
      .from("simulation_runs")
      .select("id,title,status,user_id,created_at,overall_conflict_score,goal_completion_score")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10),
    db.rpc("admin_top_users_by_run_count", { limit_n: 10 }),
  ]);

  const tiles = [
    { label: "Runs today", value: runsToday ?? 0 },
    { label: "Runs this week", value: runsWeek ?? 0 },
    { label: "Runs this month", value: runsMonth ?? 0 },
    { label: "Active now", value: runsActive ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold tracking-tight">Operator console</h1>
          <p className="text-sm text-muted-foreground">Signed in with admin password.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/10 text-xs")} href="/dashboard">
            Command Center
          </Link>
          <AdminSwitchMode />
          <AdminSignOut />
        </div>
      </header>

      <AdminStats
        tiles={tiles}
        recentRuns={(recentRuns ?? []) as Parameters<typeof AdminStats>[0]["recentRuns"]}
        topUsers={(topUsersRaw ?? []) as Parameters<typeof AdminStats>[0]["topUsers"]}
      />

      <p className="mt-10 text-xs text-muted-foreground">
        Admin session is separate from Supabase app auth. Set <code className="text-indigo-300">ADMIN_PASSWORD</code>{" "}
        in production.
      </p>
    </div>
  );
}
