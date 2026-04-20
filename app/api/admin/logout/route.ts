import { NextResponse } from "next/server";

import { adminCookieName, adminSessionCookieOptions } from "@/lib/admin/token";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, "", { ...adminSessionCookieOptions(), maxAge: 0 });
  return res;
}
