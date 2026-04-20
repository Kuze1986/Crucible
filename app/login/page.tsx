import Link from "next/link";

import { LoginDevForm } from "@/components/crucible/login-dev-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const err = sp.error;
  const nexusUrl = process.env.NEXT_PUBLIC_NEXUS_LOGIN_URL;
  const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const authCallback = `${appBase}/auth/callback`;
  const nexusHref =
    nexusUrl != null && nexusUrl !== ""
      ? `${nexusUrl}${nexusUrl.includes("?") ? "&" : "?"}redirect_to=${encodeURIComponent(authCallback)}`
      : null;

  if (nexusHref) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md border-white/10 bg-[#0f1117]">
          <CardHeader>
            <CardTitle className="font-mono text-lg tracking-tight">Crucible</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in through your NEXUS account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {err ? (
              <p className="text-sm text-red-400" role="alert">
                {err}
              </p>
            ) : null}
            <Link
              href={nexusHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Continue to sign in
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/admin/login" className="text-indigo-400 hover:underline">
                Admin sign-in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle className="font-mono text-lg tracking-tight">Crucible</CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure <code className="text-xs text-indigo-300">NEXT_PUBLIC_NEXUS_LOGIN_URL</code>{" "}
            for Nexus SSO, or use email magic link in development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? (
            <p className="text-sm text-red-400" role="alert">
              {err}
            </p>
          ) : null}
          {process.env.NODE_ENV === "development" ? (
            <LoginDevForm />
          ) : (
            <p className="text-sm text-muted-foreground">
              Production builds require Nexus login URL or a configured IdP flow.
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/admin/login" className="text-indigo-400 hover:underline">
              Admin sign-in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
