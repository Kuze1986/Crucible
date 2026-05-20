import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatTile = { label: string; value: number | string };
type RecentRun = {
  id: string;
  title: string;
  status: string;
  user_id: string;
  created_at: string;
  overall_conflict_score: number | null;
  goal_completion_score: number | null;
};
type TopUser = { user_id: string; run_count: number };

interface AdminStatsProps {
  tiles: StatTile[];
  recentRuns: RecentRun[];
  topUsers: TopUser[];
}

function fmt(n: number | null) {
  if (n === null) return "—";
  return n.toFixed(2);
}

export function AdminStats({ tiles, recentRuns, topUsers }: AdminStatsProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="border-white/10 bg-[#0f1117]">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="font-mono text-2xl font-semibold">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-mono text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Recent completions
        </h2>
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Conflict</th>
                <th className="px-3 py-2">Goal</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-medium">{r.title}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.status}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fmt(r.overall_conflict_score)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fmt(r.goal_completion_score)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No runs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-mono text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Top users by run count
        </h2>
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Runs</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono text-xs">{u.user_id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.run_count}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
