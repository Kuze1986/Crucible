"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const err = sp.get("error");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok) {
        setMessage(j.error?.message ?? "Login failed");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle className="font-mono text-lg tracking-tight">Crucible Admin</CardTitle>
          <CardDescription className="text-muted-foreground">
            Operator console — password from environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {err === "forbidden" ? (
            <p className="mb-3 text-sm text-red-400" role="alert">
              Session invalid. Sign in again.
            </p>
          ) : null}
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-black/30"
              />
            </div>
            {message ? (
              <p className="text-sm text-red-400" role="alert">
                {message}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
