"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { NotificationRow } from "@/lib/crucible/types";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [badge, setBadge] = useState(unreadCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBadge(unreadCount);
  }, [unreadCount]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/crucible/notifications");
      if (res.ok) {
        const j = (await res.json()) as {
          notifications: NotificationRow[];
          unread_count: number;
        };
        setNotifications(j.notifications ?? []);
        setBadge(j.unread_count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/crucible/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: "all" }),
    });
    setBadge(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) void loadNotifications();
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-xl p-0 hover:bg-white/[0.06]"
          aria-label="Notifications"
        >
          <Bell className="size-4 text-white/70" />
          {badge > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 border-white/10 bg-[#0f1117] p-0"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="text-xs font-medium text-white/80">Notifications</span>
          {badge > 0 ? (
            <button
              onClick={() => void markAllRead()}
              className="text-[10px] text-indigo-400 hover:text-indigo-300"
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} asChild>
                <a
                  href={n.run_id ? `/report?id=${n.run_id}` : "#"}
                  className={cn(
                    "flex cursor-pointer flex-col gap-0.5 rounded-none px-3 py-2.5 text-xs focus:bg-white/[0.06]",
                    !n.read_at ? "bg-white/[0.03]" : ""
                  )}
                >
                  <span className="font-medium text-white/90">{n.title}</span>
                  {n.body ? (
                    <span className="text-muted-foreground">{n.body}</span>
                  ) : null}
                  <span className="text-muted-foreground/60">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </a>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
