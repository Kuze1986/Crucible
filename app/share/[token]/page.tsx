import { createClient } from "@supabase/supabase-js";

import { ShareResultView } from "@/components/crucible/ShareResultView";
import { CRUCIBLE_SCHEMA } from "@/lib/supabase/schema";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export default async function ShareRunPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return <Unavailable message="This result is no longer available." />;
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: CRUCIBLE_SCHEMA },
  });

  const { data: run, error: runError } = await supabase
    .from("simulation_runs")
    .select(
      "id,title,completed_at,overall_conflict_score,goal_completion_score,experience_score,trust_trajectory,session_summary"
    )
    .eq("share_token", token)
    .single();

  if (runError || !run) {
    return <Unavailable message="This result is no longer available." />;
  }

  const { data: steps, error: stepsError } = await supabase
    .from("storyboard_steps")
    .select("id,step_number,action,conflict_score,trust_delta,behavioral_reasoning,conflict_type,created_at")
    .eq("simulation_run_id", run.id)
    .order("step_number", { ascending: true });

  if (stepsError) {
    return <Unavailable message="Unable to load storyboard details right now." />;
  }

  return <ShareResultView run={run} steps={steps ?? []} embed={isEmbed} />;
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-6 text-center">
      <div className="rounded-xl border border-white/10 bg-[#0f1117] p-6">
        <h1 className="text-lg font-semibold">Shared Result</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
