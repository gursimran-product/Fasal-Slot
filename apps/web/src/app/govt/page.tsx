"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GovtDashboardPage() {
  const { user, logout, authFetch } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const date = todayIso();

  const load = useCallback(async () => {
    if (!user?.centreId) return;
    const res = await authFetch(`/centres/${user.centreId}/dashboard?date=${date}`);
    if (res.ok) setDashboard(await res.json());
    else setError("Could not load the dashboard");
  }, [user, authFetch, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await logout();
    router.replace("/staff/login");
  }

  async function advance(bookingId: string, stage: BookingStage, extra?: { rejectReason?: string; amountPaid?: number }) {
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
    advance(bookingId, "paid", { amountPaid: amount });
  }

  if (!user?.centreId) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <p className="text-lg text-neutral-700">
          No centre assigned to this account. Cross-centre oversight view is not built yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Centre dashboard — {date}</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 rounded-lg border border-neutral-400 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            Log out
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        {!dashboard ? (
          <p className="text-neutral-600">Loading…</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {COUNT_LABELS.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-neutral-300 bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{dashboard.counts[key]}</p>
                  <p className="text-xs font-medium text-neutral-600">{label}</p>
                </div>
              ))}
            </div>

            <h2 className="mb-3 text-lg font-bold text-neutral-900">Waiting to arrive</h2>
            <div className="mb-8 flex flex-col gap-2">
              {dashboard.waiting.length === 0 && <p className="text-sm text-neutral-500">None</p>}
              {dashboard.waiting.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-neutral-300 bg-white p-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {b.farmerName} · {b.refCode}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {b.crop} · {b.timeWindow} · {b.farmerPhone}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actingOn === b.id}
                    onClick={() => advance(b.id, "arrived")}
                    className="h-9 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    Mark arrived
                  </button>
                </div>
              ))}
            </div>

            <h2 className="mb-3 text-lg font-bold text-neutral-900">Live queue</h2>
            <div className="flex flex-col gap-2">
              {dashboard.queue.length === 0 && <p className="text-sm text-neutral-500">None</p>}
              {dashboard.queue.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-neutral-300 bg-white p-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {b.farmerName} · {b.refCode}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {b.crop} · {b.timeWindow} · {b.stage}
                      {b.stage === "rejected" && b.rejectReason ? ` — ${b.rejectReason}` : ""}
                      {b.stage === "paid" && b.amountPaid ? ` — Rs ${b.amountPaid}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {b.stage === "arrived" && (
                      <button
                        type="button"
                        disabled={actingOn === b.id}
                        onClick={() => advance(b.id, "weighed")}
                        className="h-9 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
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
                          className="h-9 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={actingOn === b.id}
                          onClick={() => handleReject(b.id)}
                          className="h-9 rounded-lg border border-red-700 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
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
                        className="h-9 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        Record payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
