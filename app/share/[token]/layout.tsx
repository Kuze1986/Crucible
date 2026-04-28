import type { ReactNode } from "react";

export default function ShareTokenLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#0a0b0f]">{children}</div>;
}
