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
  low: "bg-green-100 text-green-900",
  watch: "bg-amber-100 text-amber-900",
  high: "bg-red-100 text-red-900",
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

  if (!rows) return <p className="text-neutral-600">Loading…</p>;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <button
          key={r.centre.id}
          type="button"
          onClick={() => onSelectCentre(r.centre.id)}
          className="flex items-center justify-between rounded-lg border border-neutral-300 bg-white p-4 text-left hover:bg-neutral-50"
        >
          <div>
            <p className="font-semibold text-neutral-900">{r.centre.name}</p>
            <p className="text-sm text-neutral-600">
              {r.booked} booked · {r.inFlight} in-flight · {r.completed} completed · {r.rejected} rejected
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${RISK_STYLES[r.riskLevel]}`}>
            {r.riskLevel}
          </span>
        </button>
      ))}
    </div>
  );
}
