import Link from "next/link";

import type { User } from "@supabase/supabase-js";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const nav = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/builder", label: "New simulation" },
  { href: "/library", label: "Library" },
  { href: "/profiles", label: "Profiles" },
  { href: "/settings", label: "Settings" },
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-white/10 bg-[#0f1117] md:w-52 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:flex-col md:items-stretch">
          <Link href="/dashboard" className="font-mono text-sm font-semibold tracking-tight text-white">
            Crucible
          </Link>
          <nav className="flex flex-wrap gap-1 md:flex-col">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-start text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden px-3 pb-4 text-xs text-muted-foreground md:block">
          <div className="truncate">{user.email}</div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="mt-2 w-full border-white/10">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      <div className="border-t border-white/10 p-3 text-xs text-muted-foreground md:hidden">
        <div className="truncate">{user.email}</div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="mt-2 border-white/10">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
