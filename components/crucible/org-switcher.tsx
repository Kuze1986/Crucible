"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ACTIVE_ORG_KEY = "crucible_active_org_id";

type Org = { id: string; name: string; slug: string };

export function OrgSwitcher({ orgs }: { orgs: Org[] }) {
  const router = useRouter();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    if (stored && orgs.some((o) => o.id === stored)) {
      setActiveOrgId(stored);
    }
  }, [orgs]);

  function select(id: string | null) {
    if (id) {
      localStorage.setItem(ACTIVE_ORG_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ORG_KEY);
    }
    setActiveOrgId(id);
    router.refresh();
  }

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const label = activeOrg ? activeOrg.name : "Personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/80 hover:bg-white/[0.06]">
          {label}
          <ChevronDown className="size-3 text-white/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px] border-white/10 bg-[#10172a]">
        <DropdownMenuItem
          onClick={() => select(null)}
          className={!activeOrgId ? "text-cyan-300" : ""}
        >
          Personal
        </DropdownMenuItem>
        {orgs.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => select(org.id)}
            className={activeOrgId === org.id ? "text-cyan-300" : ""}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
