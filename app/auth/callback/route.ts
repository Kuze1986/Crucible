import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSiteUrl, sanitizeNextPath } from "@/lib/auth/site-url";

export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const siteUrl = getSiteUrl(request);
  const next = sanitizeNextPath(urlObj.searchParams.get("next"), "/dashboard");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login?error=config", siteUrl));
  }

  const cookieStore = await cookies();
  const access_token = urlObj.searchParams.get("access_token");
  const refresh_token = urlObj.searchParams.get("refresh_token");

  if (access_token && refresh_token) {
    const redirectTarget = new URL(next, siteUrl);
    const redirectResponse = NextResponse.redirect(redirectTarget);
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, siteUrl)
      );
    }
    return redirectResponse;
  }

  const code = urlObj.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  const redirectTarget = new URL(next, siteUrl);
  const redirectResponse = NextResponse.redirect(redirectTarget);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, siteUrl)
    );
  }

  return redirectResponse;
}
