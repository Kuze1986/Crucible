import Link from "next/link";

import { CrucibleLoginForm } from "@/components/crucible/crucible-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle className="font-mono text-lg tracking-tight">Crucible</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with your Supabase email and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CrucibleLoginForm initialError={sp.error} />
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
