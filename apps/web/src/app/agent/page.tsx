"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, Centre, CentreCapacityWithAvailability, Farmer, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { CROPS, cropLabel } from "@/lib/crops";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "pa", label: "Punjabi" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextDays(count: number): { date: string; label: string }[] {
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), label: formatter.format(d) });
  }
  return days;
}

export default function AgentHomePage() {
  const { user, logout, authFetch } = useAuth();
  const router = useRouter();

  const [farmers, setFarmers] = useState<Farmer[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ name: "", phone: "", village: "", language: "en" as Language });
  const [addingFarmer, setAddingFarmer] = useState(false);

  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set());
  const [crop, setCrop] = useState<string>(CROPS[0]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState<string>("");
  const [day, setDay] = useState<string>(todayIso());
  const [timeWindows, setTimeWindows] = useState<CentreCapacityWithAvailability[]>([]);
  const [timeWindow, setTimeWindow] = useState<string>("");
  const [booking, setBooking] = useState(false);
  const [batchResult, setBatchResult] = useState<{ booked: number; skipped: { farmerId: string; reason: string }[] } | null>(null);

  const days = useMemo(() => nextDays(14), []);

  const load = useCallback(async () => {
    if (!user) return;
    const [farmersRes, bookingsRes, centresRes] = await Promise.all([
      authFetch(`/agents/${user.id}/farmers`),
      authFetch(`/agents/${user.id}/bookings`),
      authFetch(`/centres`),
    ]);
    if (farmersRes.ok) setFarmers((await farmersRes.json()).farmers);
    if (bookingsRes.ok) setBookings((await bookingsRes.json()).bookings);
    if (centresRes.ok) {
      const { centres: list } = await centresRes.json();
      setCentres(list);
      if (!centreId && list.length > 0) setCentreId(list[0].id);
    }
  }, [user, authFetch, centreId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!centreId || !day) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres/${centreId}/capacity?date=${day}`);
      if (res.ok) {
        const { time_windows: windows } = await res.json();
        if (!cancelled) {
          setTimeWindows(windows);
          setTimeWindow((prev) => (windows.some((w: CentreCapacityWithAvailability) => w.timeWindow === prev) ? prev : windows[0]?.timeWindow ?? ""));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centreId, day, authFetch]);

  function latestBookingFor(farmerId: string): Booking | undefined {
    return bookings?.find((b) => b.farmerId === farmerId);
  }

  async function handleAddFarmer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddingFarmer(true);
    try {
      const res = await authFetch("/farmers", {
        method: "POST",
        body: JSON.stringify(newFarmer),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not add farmer");
        return;
      }
      setNewFarmer({ name: "", phone: "", village: "", language: "en" });
      setShowAddFarmer(false);
      await load();
    } finally {
      setAddingFarmer(false);
    }
  }

  function toggleFarmer(id: string) {
    setSelectedFarmerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchBook() {
    if (selectedFarmerIds.size === 0 || !centreId || !timeWindow) return;
    setBooking(true);
    setError(null);
    setBatchResult(null);
    try {
      const res = await authFetch("/bookings/batch", {
        method: "POST",
        body: JSON.stringify({
          farmerIds: Array.from(selectedFarmerIds),
          centreId,
          crop,
          date: day,
          timeWindow,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Batch booking failed");
        return;
      }
      setBatchResult({ booked: body.bookings.length, skipped: body.skipped });
      setSelectedFarmerIds(new Set());
      await load();
    } finally {
      setBooking(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/staff/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Agent tool — {user?.name}</h1>
          <button type="button" onClick={handleLogout} className="h-10 rounded-lg border border-neutral-400 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100">
            Log out
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mb-8 rounded-xl border border-neutral-300 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">My farmers</h2>
            <button
              type="button"
              onClick={() => setShowAddFarmer((v) => !v)}
              className="h-9 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800"
            >
              {showAddFarmer ? "Cancel" : "Add farmer"}
            </button>
          </div>

          {showAddFarmer && (
            <form onSubmit={handleAddFarmer} className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-4">
              <input
                required
                placeholder="Name"
                value={newFarmer.name}
                onChange={(e) => setNewFarmer((f) => ({ ...f, name: e.target.value }))}
                className="h-10 rounded-lg border border-neutral-400 px-3 text-sm"
              />
              <input
                required
                placeholder="10-digit phone"
                value={newFarmer.phone}
                onChange={(e) => setNewFarmer((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className="h-10 rounded-lg border border-neutral-400 px-3 text-sm"
              />
              <input
                placeholder="Village (optional)"
                value={newFarmer.village}
                onChange={(e) => setNewFarmer((f) => ({ ...f, village: e.target.value }))}
                className="h-10 rounded-lg border border-neutral-400 px-3 text-sm"
              />
              <select
                value={newFarmer.language}
                onChange={(e) => setNewFarmer((f) => ({ ...f, language: e.target.value as Language }))}
                className="h-10 rounded-lg border border-neutral-400 px-3 text-sm"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={addingFarmer}
                className="col-span-2 h-10 rounded-lg bg-green-700 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                Save farmer
              </button>
            </form>
          )}

          <div className="flex flex-col gap-2">
            {farmers?.length === 0 && <p className="text-sm text-neutral-500">No farmers added yet.</p>}
            {farmers?.map((f) => {
              const latest = latestBookingFor(f.id);
              return (
                <label key={f.id} className="flex items-center justify-between rounded-lg border border-neutral-300 p-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFarmerIds.has(f.id)}
                      onChange={() => toggleFarmer(f.id)}
                      className="h-5 w-5"
                    />
                    <div>
                      <p className="font-semibold text-neutral-900">{f.name}</p>
                      <p className="text-sm text-neutral-600">
                        {f.phone} {f.village ? `· ${f.village}` : ""}
                      </p>
                    </div>
                  </div>
                  {latest && (
                    <span className="text-sm font-medium text-neutral-700">
                      {latest.refCode} · {latest.stage}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-300 bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-neutral-900">Batch book a slot</h2>
          <p className="mb-4 text-sm text-neutral-600">
            {selectedFarmerIds.size} farmer{selectedFarmerIds.size === 1 ? "" : "s"} selected above
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="h-10 rounded-lg border border-neutral-400 px-2 text-sm">
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {cropLabel(c, "en")}
                </option>
              ))}
            </select>
            <select value={centreId} onChange={(e) => setCentreId(e.target.value)} className="h-10 rounded-lg border border-neutral-400 px-2 text-sm">
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="h-10 rounded-lg border border-neutral-400 px-2 text-sm">
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.label}
                </option>
              ))}
            </select>
            <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className="h-10 rounded-lg border border-neutral-400 px-2 text-sm">
              {timeWindows.map((w) => (
                <option key={w.timeWindow} value={w.timeWindow} disabled={w.availableSlots === 0}>
                  {w.timeWindow} ({w.availableSlots} left)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={booking || selectedFarmerIds.size === 0 || !timeWindow}
            onClick={handleBatchBook}
            className="h-11 rounded-lg bg-green-700 px-5 text-base font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            Book selected farmers
          </button>

          {batchResult && (
            <p className="mt-4 text-sm font-medium text-neutral-800">
              Booked {batchResult.booked}.{" "}
              {batchResult.skipped.length > 0 && `${batchResult.skipped.length} skipped (centre full for this slot).`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
