import { SettingsForm } from "@/components/crucible/settings-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <SettingsForm email={user?.email ?? ""} />;
}
