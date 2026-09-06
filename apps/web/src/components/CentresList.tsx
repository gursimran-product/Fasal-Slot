"use client";

import { useEffect, useState } from "react";
import type { Centre, CentreCapacityWithAvailability, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";

interface CentreWithCapacity {
  centre: Centre;
  timeWindows: CentreCapacityWithAvailability[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CentresList({ language }: { language: Language }) {
  const { authFetch } = useAuth();
  const [centres, setCentres] = useState<CentreWithCapacity[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch("/centres");
        if (!res.ok) throw new Error("failed to load centres");
        const { centres: list } = (await res.json()) as { centres: Centre[] };

        const date = todayIso();
        const withCapacity = await Promise.all(
          list.map(async (centre) => {
            const capRes = await authFetch(`/centres/${centre.id}/capacity?date=${date}`);
            const { time_windows: timeWindows } = capRes.ok
              ? ((await capRes.json()) as { time_windows: CentreCapacityWithAvailability[] })
              : { time_windows: [] };
            return { centre, timeWindows };
          })
        );

        if (!cancelled) setCentres(withCapacity);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  if (error) return null;
  if (!centres) {
    return <p className="font-body text-base text-slate-600">Loading centres…</p>;
  }

  return (
    <div className="w-full">
      <h2 className="mb-3 font-sans text-lg font-bold text-slate-ink">
        {t("centresNearYou", language)}
      </h2>
      <div className="flex flex-col gap-3">
        {centres.map(({ centre, timeWindows }) => (
          <div key={centre.id} className="rounded-lg border-[1.5px] border-slate-300 bg-white p-4">
            <p className="font-sans text-lg font-bold text-slate-ink">{centre.name}</p>
            {centre.district && (
              <p className="mb-2 font-body text-sm text-slate-600">{centre.district}</p>
            )}
            <p className="mb-1 font-sans text-sm font-semibold text-slate-700">
              {t("todaySlots", language)}
            </p>
            <div className="flex flex-wrap gap-2">
              {timeWindows.map((w) => (
                <span
                  key={w.timeWindow}
                  className={`rounded border px-3 py-2 font-mono text-sm font-medium ${
                    w.availableSlots > 0
                      ? "border-[#15803D]/30 bg-[#DCFCE7] text-[#15803D]"
                      : "border-slate-300 bg-slate-100 text-slate-500"
                  }`}
                >
                  {w.timeWindow}:{" "}
                  {w.availableSlots > 0
                    ? `${w.availableSlots} ${t("slotsAvailable", language)}`
                    : t("slotsFull", language)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
