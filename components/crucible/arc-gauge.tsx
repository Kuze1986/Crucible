"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function colorFor(v: number) {
  if (v < 0.33) return { stroke: "#34d399", text: "text-emerald-400" };
  if (v < 0.66) return { stroke: "#fbbf24", text: "text-amber-300" };
  return { stroke: "#f87171", text: "text-red-400" };
}

export function ArcGauge({ value, label }: { value: number | null | undefined; label?: string }) {
  const v = Math.min(1, Math.max(0, value ?? 0));
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(v));
    return () => cancelAnimationFrame(t);
  }, [v]);

  const r = 52;
  const cx = 60;
  const cy = 60;
  const start = Math.PI;
  const end = start + animated * Math.PI;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = animated > 0.5 ? 1 : 0;
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  const { stroke, text } = colorFor(animated);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="72" viewBox="0 0 120 72" className="overflow-visible">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div className={cn("-mt-2 text-center font-mono text-lg tabular-nums", text)}>
        {(animated * 100).toFixed(0)}%
      </div>
      {label ? <div className="text-xs text-muted-foreground">{label}</div> : null}
    </div>
  );
}
