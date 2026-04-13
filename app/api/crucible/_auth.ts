import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase, user };
}
