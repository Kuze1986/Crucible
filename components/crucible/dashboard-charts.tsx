"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SimulationRunRow } from "@/lib/crucible/types";

export function DashboardCharts({ runs }: { runs: SimulationRunRow[] }) {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const lineData = sorted
    .filter((r) => r.status === "completed")
    .map((r) => ({
  t: new Date(r.created_at).toLocaleDateString(),
  conflict: r.overall_conflict_score != null ? Number(r.overall_conflict_score) : null,
  experience: r.experience_score != null ? Number(r.experience_score) : null,
}));

  const statusCounts = ["queued", "running", "completed", "failed"].map((s) => ({
    status: s,
    count: runs.filter((r) => r.status === s).length,
  }));

  if (runs.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Status breakdown
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="status" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Scores over time (completed)
        </h3>
        <div className="h-56">
          {lineData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed runs yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="t" stroke="#888" fontSize={10} />
                <YAxis domain={[0, 1]} stroke="#888" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <Line type="monotone" dataKey="conflict" stroke="#f87171" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="experience" stroke="#34d399" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
