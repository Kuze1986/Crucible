import Link from "next/link";

import type { User } from "@supabase/supabase-js";
import {
  BarChart3,
  Bot,
  FolderKanban,
  LayoutDashboard,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const nav = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/builder", label: "New simulation", icon: Bot },
  { href: "/library", label: "Library", icon: FolderKanban },
  { href: "/profiles", label: "Profiles", icon: Users },
  { href: "/compare", label: "Compare", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export async function AppChrome({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  async function signOut() {
    "use server";
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-screen flex-col p-3 md:flex-row md:gap-3 md:p-5">
      <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#10172a]/85 shadow-2xl backdrop-blur-xl md:w-72">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-[11px] font-bold text-[#07222a]">
              K
            </span>
            <span className="font-mono text-base font-semibold tracking-tight">Crucible</span>
          </Link>
          <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 md:flex">
            <UserCircle2 className="size-3.5 text-cyan-300" />
            Operator
          </div>
        </div>
        <div className="px-3 py-3">
          <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-start gap-2 rounded-xl border border-transparent text-white/80 hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-100"
                )}
              >
                <item.icon className="size-4 text-cyan-300/90" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden border-t border-white/10 px-3 pb-4 pt-3 text-xs text-white/70 md:block">
          <div className="truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            {user.email}
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="mt-2 w-full border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08]"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#0f1528]/75 p-4 shadow-2xl backdrop-blur-xl md:p-7">
        {children}
      </main>
      <div className="mt-2 rounded-xl border border-white/10 bg-[#10172a]/85 p-3 text-xs text-white/70 md:hidden">
        <div className="truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{user.email}</div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="mt-2 border-white/15 bg-white/[0.03] text-white">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
