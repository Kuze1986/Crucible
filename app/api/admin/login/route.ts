import { NextResponse } from "next/server";
import { z } from "zod";

import { adminCookieName, adminSessionCookieOptions, createAdminSessionToken } from "@/lib/admin/token";

const BodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (!configured) {
    return NextResponse.json(
      { error: { code: "admin_disabled", message: "Set ADMIN_PASSWORD in environment." } },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "validation", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "validation", message: "Invalid body" } }, { status: 400 });
  }

  const ok =
    parsed.data.password.length === configured.length &&
    (() => {
      let diff = 0;
      for (let i = 0; i < configured.length; i++) {
        diff |= parsed.data.password.charCodeAt(i) ^ configured.charCodeAt(i);
      }
      return diff === 0;
    })();

  if (!ok) {
    return NextResponse.json({ error: { code: "invalid", message: "Invalid password" } }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json({ error: { code: "server", message: "Could not create session" } }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, token, adminSessionCookieOptions());
  return res;
}
