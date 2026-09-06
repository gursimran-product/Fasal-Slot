"use client";

import { useCallback, useEffect, useState } from "react";
import type { Booking, BookingStage } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";

interface BookingWithFarmer extends Booking {
  farmerName: string;
  farmerPhone: string;
}

interface Dashboard {
  counts: Record<BookingStage, number>;
  queue: BookingWithFarmer[];
  waiting: BookingWithFarmer[];
}

const COUNT_LABELS: { key: BookingStage; label: string }[] = [
  { key: "booked", label: "Booked" },
  { key: "arrived", label: "Arrived" },
  { key: "weighed", label: "Weighed" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "paid", label: "Paid" },
];

const STAGE_TEXT_CLASS: Record<BookingStage, string> = {
  booked: "text-[#0369A1]",
  arrived: "text-[#B45309]",
  weighed: "text-[#4338CA]",
  accepted: "text-[#15803D]",
  paid: "text-[#047857]",
  rejected: "text-[#991B1B]",
  cancelled: "text-slate-500",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CentreDashboard({ centreId, canAct = true }: { centreId: string; canAct?: boolean }) {
  const { authFetch } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const date = todayIso();

  const load = useCallback(async () => {
    const res = await authFetch(`/centres/${centreId}/dashboard?date=${date}`);
    if (res.ok) setDashboard(await res.json());
    else setError("Could not load the dashboard");
  }, [centreId, authFetch, date]);

  useEffect(() => {
    setDashboard(null);
    load();
  }, [load]);

  async function advance(
    bookingId: string,
    stage: BookingStage,
    extra?: {
      rejectReason?: string;
      amountPaid?: number;
      moisturePct?: number;
      weighbridgeToken?: string;
      gateNumber?: string;
      jformNumber?: string;
      utrReference?: string;
    }
  ) {
    setActingOn(bookingId);
    setError(null);
    try {
      const res = await authFetch(`/bookings/${bookingId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, ...extra }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "That action failed");
        return;
      }
      await load();
    } finally {
      setActingOn(null);
    }
  }

  function handleReject(bookingId: string) {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    advance(bookingId, "rejected", { rejectReason: reason });
  }

  function handleRecordPayment(bookingId: string) {
    const raw = window.prompt("Amount paid (Rs):");
    if (!raw) return;
    const amount = Number(raw);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    const jformNumber = window.prompt("J-Form number (optional):") ?? undefined;
    const utrReference = window.prompt("UTR / bank reference number (optional):") ?? undefined;
    advance(bookingId, "paid", {
      amountPaid: amount,
      jformNumber: jformNumber || undefined,
      utrReference: utrReference || undefined,
    });
  }

  function handleMarkWeighed(bookingId: string) {
    const moistureRaw = window.prompt("Moisture % measured (optional):") ?? undefined;
    const weighbridgeToken = window.prompt("Weighbridge token number (optional):") ?? undefined;
    const gateNumber = window.prompt("Gate number (optional):") ?? undefined;
    const moisturePct = moistureRaw ? Number(moistureRaw) : undefined;
    if (moistureRaw && Number.isNaN(moisturePct)) {
      setError("Enter a valid moisture percentage");
      return;
    }
    advance(bookingId, "weighed", {
      moisturePct,
      weighbridgeToken: weighbridgeToken || undefined,
      gateNumber: gateNumber || undefined,
    });
  }

  if (!dashboard) {
    return <p className="font-body text-slate-600">Loading…</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded border-2 border-[#B91C1C] bg-[#FEE2E2] px-4 py-2 font-body text-sm font-medium text-[#991B1B]">{error}</p>
      )}

      {/* Real-time counter strip */}
      <div className="mb-8 grid grid-cols-3 gap-3 rounded-lg border-[1.5px] border-slate-300 bg-white p-3 sm:grid-cols-6">
        {COUNT_LABELS.map(({ key, label }) => (
          <div key={key} className="text-center">
            <p className={`font-mono text-2xl font-bold ${STAGE_TEXT_CLASS[key]}`}>{dashboard.counts[key]}</p>
            <p className="font-sans text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-sans text-lg font-bold text-slate-ink">Waiting to arrive</h2>
      <div className="mb-8 flex flex-col gap-2">
        {dashboard.waiting.length === 0 && <p className="font-body text-sm text-slate-500">None</p>}
        {dashboard.waiting.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border-[1.5px] border-slate-300 bg-white p-3">
            <div>
              <p className="font-sans font-bold text-slate-ink">
                {b.farmerName} · <span className="font-mono">{b.refCode}</span>
              </p>
              <p className="font-body text-sm text-slate-600">
                {b.crop} · {b.timeWindow} · {b.farmerPhone}
              </p>
            </div>
            {canAct && (
              <button
                type="button"
                disabled={actingOn === b.id}
                onClick={() => advance(b.id, "arrived")}
                className="h-9 rounded bg-canopy px-3 font-sans text-sm font-bold text-white hover:bg-canopy-deep disabled:opacity-60"
              >
                Mark arrived
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-sans text-lg font-bold text-slate-ink">Live queue</h2>
      <div className="flex flex-col gap-2">
        {dashboard.queue.length === 0 && <p className="font-body text-sm text-slate-500">None</p>}
        {dashboard.queue.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border-[1.5px] border-slate-300 bg-white p-3">
            <div>
              <p className="font-sans font-bold text-slate-ink">
                {b.farmerName} · <span className="font-mono">{b.refCode}</span>
              </p>
              <p className="font-body text-sm text-slate-600">
                {b.crop} · {b.timeWindow} ·{" "}
                <span className={`font-sans font-bold uppercase ${STAGE_TEXT_CLASS[b.stage]}`}>{b.stage}</span>
                {b.stage === "rejected" && b.rejectReason ? ` — ${b.rejectReason}` : ""}
                {b.stage === "paid" && b.amountPaid ? ` — Rs ${b.amountPaid}` : ""}
                {b.gateNumber ? ` · Gate ${b.gateNumber}` : ""}
                {b.weighbridgeToken ? ` · Token ${b.weighbridgeToken}` : ""}
                {b.moisturePct != null ? ` · Moisture ${b.moisturePct}%` : ""}
                {b.jformNumber ? ` · J-Form ${b.jformNumber}` : ""}
                {b.utrReference ? ` · UTR ${b.utrReference}` : ""}
              </p>
            </div>
            {canAct && (
              <div className="flex gap-2">
                {b.stage === "arrived" && (
                  <button
                    type="button"
                    disabled={actingOn === b.id}
                    onClick={() => handleMarkWeighed(b.id)}
                    className="h-9 rounded bg-canopy px-3 font-sans text-sm font-bold text-white hover:bg-canopy-deep disabled:opacity-60"
                  >
                    Mark weighed
                  </button>
                )}
                {b.stage === "weighed" && (
                  <>
                    <button
                      type="button"
                      disabled={actingOn === b.id}
                      onClick={() => advance(b.id, "accepted")}
                      className="h-9 rounded bg-canopy px-3 font-sans text-sm font-bold text-white hover:bg-canopy-deep disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actingOn === b.id}
                      onClick={() => handleReject(b.id)}
                      className="h-9 rounded border-[1.5px] border-[#B91C1C] px-3 font-sans text-sm font-bold text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                )}
                {b.stage === "accepted" && (
                  <button
                    type="button"
                    disabled={actingOn === b.id}
                    onClick={() => handleRecordPayment(b.id)}
                    className="h-9 rounded bg-canopy px-3 font-sans text-sm font-bold text-white hover:bg-canopy-deep disabled:opacity-60"
                  >
                    Record payment
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
