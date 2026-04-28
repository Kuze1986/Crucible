"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AdminSwitchMode() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function switchToClientMode() {
    setLoading(true);
    try {
      // End admin-mode cookie so the user is clearly in client flow only.
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10"
      disabled={loading}
      onClick={() => void switchToClientMode()}
    >
      {loading ? "Switching…" : "Switch to client mode"}
    </Button>
  );
}
