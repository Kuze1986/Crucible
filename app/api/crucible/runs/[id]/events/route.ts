import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  const { data: run } = await session.supabase
    .from("simulation_runs")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream already closed
        }
      };

      send({ status: run.status });

      if (run.status === "completed" || run.status === "failed") {
        try { controller.close(); } catch { /* already closed */ }
        return;
      }

      const crucible = createServiceSupabaseCrucible();
      let lastStatus = run.status as string;

      intervalId = setInterval(async () => {
        try {
          const { data } = await crucible
            .from("simulation_runs")
            .select("status, overall_conflict_score, goal_completion_score, experience_score")
            .eq("id", id)
            .single();

          if (!data) {
            if (intervalId) clearInterval(intervalId);
            try { controller.close(); } catch { /* already closed */ }
            return;
          }

          if (data.status !== lastStatus) {
            lastStatus = data.status as string;
            send(data);
            if (data.status === "completed" || data.status === "failed") {
              if (intervalId) clearInterval(intervalId);
              try { controller.close(); } catch { /* already closed */ }
            }
          }
        } catch {
          if (intervalId) clearInterval(intervalId);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 2000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
