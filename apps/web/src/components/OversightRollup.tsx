"use client";

import { useEffect, useState } from "react";
import type { Centre } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";

interface CentreRisk {
  centre: Centre;
  booked: number;
  inFlight: number;
  completed: number;
  rejected: number;
  riskLevel: "low" | "watch" | "high";
}

const RISK_STYLES: Record<CentreRisk["riskLevel"], string> = {
  low: "border-[#15803D]/30 bg-[#DCFCE7] text-[#15803D]",
  watch: "border-[#B45309]/30 bg-[#FEF3C7] text-[#B45309]",
  high: "border-[#B91C1C]/30 bg-[#FEE2E2] text-[#991B1B]",
};

export function OversightRollup({ onSelectCentre }: { onSelectCentre: (centreId: string) => void }) {
  const { authFetch } = useAuth();
  const [rows, setRows] = useState<CentreRisk[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/oversight/centres");
      if (res.ok) {
        const { centres } = await res.json();
        if (!cancelled) setRows(centres);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  if (!rows) return <p className="font-body text-slate-600">Loading…</p>;

  return (
    <div className="overflow-hidden rounded-lg border-[1.5px] border-slate-300 bg-white">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 bg-chalk px-4 py-2 font-sans text-xs font-bold uppercase tracking-wide text-slate-600">
        <span>Centre</span>
        <span>Backlog risk</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.centre.id}
          type="button"
          onClick={() => onSelectCentre(r.centre.id)}
          className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-chalk"
        >
          <div>
            <p className="font-sans font-bold text-slate-ink">{r.centre.name}</p>
            <p className="font-mono text-sm text-slate-600">
              {r.booked} booked · {r.inFlight} in-flight · {r.completed} completed · {r.rejected} rejected
            </p>
          </div>
          <span className={`shrink-0 rounded border px-3 py-1 font-sans text-xs font-bold uppercase ${RISK_STYLES[r.riskLevel]}`}>
            {r.riskLevel}
          </span>
        </button>
      ))}
    </div>
  );
}
