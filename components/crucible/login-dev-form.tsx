"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignWindowLocationFromRedirectToSession } from "@/lib/auth/client-redirect-to";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginDevForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdLoading(true);
    setPwdError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPwdError(error.message);
        return;
      }

      if (!data.session) {
        setPwdError("No session returned.");
        return;
      }

      if (!assignWindowLocationFromRedirectToSession(data.session)) {
        setPwdError("Invalid redirect_to");
      }
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPwdLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMessage(error.message);
      else setSent(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-emerald-400">
        Check your email for the magic link (development only).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="border-white/10 bg-black/40"
          />
        </div>
        {message ? <p className="text-sm text-red-400">{message}</p> : null}
        <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500">
          {loading ? "Sending…" : "Send magic link"}
        </Button>
      </form>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs text-muted-foreground">Development: email + password</p>
        <form onSubmit={onPasswordSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="dev-password">Password</Label>
            <Input
              id="dev-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="border-white/10 bg-black/40"
            />
          </div>
          {pwdError ? <p className="text-sm text-red-400">{pwdError}</p> : null}
          <Button
            type="submit"
            disabled={pwdLoading}
            variant="outline"
            className="w-full border-white/20 bg-transparent hover:bg-white/5"
          >
            {pwdLoading ? "Signing in…" : "Sign in with password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
