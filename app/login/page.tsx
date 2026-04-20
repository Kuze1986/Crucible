import Link from "next/link";

import { buildNexusLoginUrl } from "@/lib/auth/nexus-login-url";
import { resolvePublicAppUrl } from "@/lib/auth/public-origin";
import { LoginDevForm } from "@/components/crucible/login-dev-form";
import { NexusSignInLink } from "@/components/crucible/nexus-sign-in-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; redirect_to?: string }>;
}) {
  const sp = await searchParams;
  const err = sp.error;
  const appBase = await resolvePublicAppUrl();
  const nexusHref = buildNexusLoginUrl(sp.next, appBase || undefined);

  if (nexusHref !== "/login") {
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
            <NexusSignInLink
              href={nexusHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Continue to sign in
            </NexusSignInLink>
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
