"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Booking, BookingStage, Centre, CentreCapacityWithAvailability, CentreYardStatus, Farmer, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { CROPS, cropLabel } from "@/lib/crops";
import { mspRate } from "@/lib/msp";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "pa", label: "Punjabi" },
];

const STAGE_ORDER: BookingStage[] = ["booked", "arrived", "weighed", "accepted", "paid"];
const STAGE_LABEL: Record<BookingStage, string> = {
  booked: "Booked",
  arrived: "Arrived",
  weighed: "Weighing",
  accepted: "Accepted",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const STAGE_BAR_COLOR: Record<BookingStage, string> = {
  booked: "bg-emerald-800",
  arrived: "bg-amber-500",
  weighed: "bg-amber-500",
  accepted: "bg-emerald-800",
  paid: "bg-emerald-800",
  rejected: "bg-red-500",
  cancelled: "bg-slate-300",
};

type FilterKey = "all" | BookingStage;

interface AgentPublicInfo {
  id: string;
  name: string;
  phone: string | null;
  licenseNumber: string | null;
  centreId: string | null;
}

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

  const [agentInfo, setAgentInfo] = useState<AgentPublicInfo | null>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [farmers, setFarmers] = useState<Farmer[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [passModalFarmerId, setPassModalFarmerId] = useState<string | null>(null);

  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set());
  const [crop, setCrop] = useState<string>(CROPS[0]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState<string>("");
  const [day, setDay] = useState<string>(todayIso());
  const [timeWindows, setTimeWindows] = useState<CentreCapacityWithAvailability[]>([]);
  const [timeWindow, setTimeWindow] = useState<string>("");
  const [booking, setBooking] = useState(false);
  const [batchResult, setBatchResult] = useState<{ booked: number; skipped: { farmerId: string; reason: string }[] } | null>(null);

  const [yardStatus, setYardStatus] = useState<CentreYardStatus | null>(null);
  const [editingYard, setEditingYard] = useState(false);
  const [yardForm, setYardForm] = useState({ lanesOccupied: "0", lanesTotal: "0", gunnyStock: "", storageLifting: "" });
  const [savingYard, setSavingYard] = useState(false);

  const days = useMemo(() => nextDays(14), []);

  const loadYardStatus = useCallback(async () => {
    if (!agentInfo?.centreId) return;
    const res = await authFetch(`/centres/${agentInfo.centreId}/yard-status`);
    if (res.ok) {
      const { yardStatus: status } = (await res.json()) as { yardStatus: CentreYardStatus };
      setYardStatus(status);
      setYardForm({
        lanesOccupied: String(status.weighbridgeLanesOccupied),
        lanesTotal: String(status.weighbridgeLanesTotal),
        gunnyStock: status.gunnyBagStockPct != null ? String(status.gunnyBagStockPct) : "",
        storageLifting: status.storageLiftingPct != null ? String(status.storageLiftingPct) : "",
      });
    }
  }, [agentInfo, authFetch]);

  useEffect(() => {
    loadYardStatus();
  }, [loadYardStatus]);

  async function handleSaveYardStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!agentInfo?.centreId) return;
    setSavingYard(true);
    try {
      const res = await authFetch(`/centres/${agentInfo.centreId}/yard-status`, {
        method: "PUT",
        body: JSON.stringify({
          weighbridgeLanesOccupied: Number(yardForm.lanesOccupied) || 0,
          weighbridgeLanesTotal: Number(yardForm.lanesTotal) || 0,
          gunnyBagStockPct: yardForm.gunnyStock === "" ? null : Number(yardForm.gunnyStock),
          storageLiftingPct: yardForm.storageLifting === "" ? null : Number(yardForm.storageLifting),
        }),
      });
      if (res.ok) {
        const { yardStatus: status } = (await res.json()) as { yardStatus: CentreYardStatus };
        setYardStatus(status);
        setEditingYard(false);
      }
    } finally {
      setSavingYard(false);
    }
  }

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
      setCentreId((prev) => prev || list[0]?.id || "");
    }
  }, [user, authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  // Real identity: agent's own license number and assigned centre.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/agents/${user.id}`);
      if (res.ok) {
        const { agent } = (await res.json()) as { agent: AgentPublicInfo };
        if (!cancelled) setAgentInfo(agent);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  useEffect(() => {
    if (!agentInfo?.centreId || centres.length === 0) return;
    setCentre(centres.find((c) => c.id === agentInfo.centreId) ?? null);
  }, [agentInfo, centres]);

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
    router.replace("/login?as=agent");
  }

  // Real KPIs, computed from this agent's actual bookings for today.
  const today = todayIso();
  const todaysBookings = useMemo(() => (bookings ?? []).filter((b) => b.date === today), [bookings, today]);
  const countByStage = useCallback(
    (stages: BookingStage[]) => todaysBookings.filter((b) => stages.includes(b.stage)).length,
    [todaysBookings]
  );
  const todaysWeightQtl = useMemo(
    () =>
      todaysBookings
        .filter((b) => b.stage !== "cancelled" && b.stage !== "rejected")
        .reduce((sum, b) => sum + (b.quantityQtl ?? 0), 0),
    [todaysBookings]
  );
  const todaysMspValue = useMemo(
    () =>
      todaysBookings
        .filter((b) => b.stage !== "cancelled" && b.stage !== "rejected")
        .reduce((sum, b) => sum + (b.quantityQtl ?? 0) * mspRate(b.crop), 0),
    [todaysBookings]
  );
  const estimatedCommission = todaysMspValue * 0.025;

  const selectedCentreFreeSlots = useMemo(() => {
    const w = timeWindows.find((tw) => tw.timeWindow === timeWindow);
    return w?.availableSlots ?? 0;
  }, [timeWindows, timeWindow]);

  const roster = useMemo(() => {
    if (!farmers) return [];
    return farmers
      .map((f) => ({ farmer: f, latest: latestBookingFor(f.id) }))
      .filter(({ farmer, latest }) => {
        if (filter !== "all" && latest?.stage !== filter) return false;
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          farmer.name.toLowerCase().includes(term) ||
          farmer.phone.toLowerCase().includes(term) ||
          (latest?.vehicleNumber ?? "").toLowerCase().includes(term)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmers, bookings, filter, search]);

  const passModalEntry = passModalFarmerId ? roster.find((r) => r.farmer.id === passModalFarmerId) : null;

  const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All (${farmers?.length ?? 0})` },
    { key: "booked", label: `Booked (${countByStage(["booked"])})` },
    { key: "arrived", label: `Arrived (${countByStage(["arrived"])})` },
    { key: "weighed", label: `Weighed (${countByStage(["weighed", "accepted"])})` },
    { key: "paid", label: `Paid (${countByStage(["paid"])})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Institutional top bar */}
      <div className="w-full bg-emerald-950 text-white">
        <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-between px-6 text-xs">
          <span className="font-bold tracking-wide text-emerald-200">
            PUNJAB MANDI BOARD &middot; COMMISSION AGENT (ARHTIYA) PORTAL{centre ? ` · ${centre.name}` : ""} &middot; RMS 2026-27 Rabi Wheat
          </span>
          <a href="tel:18001802060" className="flex items-center gap-1.5 font-mono">
            <span className="material-symbols-outlined text-[16px] text-emerald-300">call</span>
            24x7 Helpdesk: 1800-180-2060
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-emerald-900">Arhtiya Dashboard</span>
              <span className="text-xs text-slate-500">Agent Command Centre &middot; Fasal Slot Mandi OS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className="rounded px-2.5 py-1 text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push("/agent/profile")}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 hover:bg-slate-100"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-800 text-white">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="flex items-center gap-1 text-xs font-bold leading-tight text-slate-900">
                  {agentInfo?.name ?? user?.name}
                  <span className="material-symbols-outlined text-[14px] text-emerald-700">verified</span>
                </span>
                <span className="text-[11px] leading-tight text-slate-500">
                  {agentInfo?.licenseNumber ? `Lic: ${agentInfo.licenseNumber}` : "—"}
                  {centre ? ` · ${centre.name}` : ""}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-red-100 hover:text-red-800"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Log out
            </button>
          </div>
        </div>

        {/* KPI ticker — real, computed from today's actual bookings */}
        <div className="w-full border-t border-slate-100 bg-slate-50">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 overflow-x-auto px-6 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="text-slate-500">Booked Today</span>
              <span className="font-mono text-base font-bold text-emerald-800">{countByStage(["booked"])}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="text-slate-500">Arrived / Queued</span>
              <span className="font-mono text-base font-bold text-amber-700">{countByStage(["arrived"])}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="text-slate-500">Weighed & Accepted</span>
              <span className="font-mono text-base font-bold text-emerald-800">{countByStage(["weighed", "accepted"])}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm">
              <span className="text-slate-500">Paid</span>
              <span className="font-mono text-base font-bold text-emerald-800">{countByStage(["paid"])}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-900 px-3 py-1.5 text-xs text-white">
                <span className="text-emerald-200">Today&apos;s Weight</span>
                <span className="font-mono text-base font-bold">{todaysWeightQtl} Qtl</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-1.5 text-xs">
                <span className="text-slate-600">MSP Total Value</span>
                <span className="font-mono text-base font-bold text-emerald-900">₹{todaysMspValue.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs">
                <span className="text-amber-900">Est. 2.5% Commission</span>
                <span className="font-mono text-base font-bold text-amber-800">₹{estimatedCommission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-6 py-6">
        {error && <p className="rounded border-2 border-red-700 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">{error}</p>}

        {/* Search + actions */}
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:min-w-[320px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-slate-400">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer name, phone, or vehicle number..."
              className="h-11 w-full rounded-lg bg-slate-50 pl-10 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <button
            type="button"
            onClick={() => router.push("/agent/add-farmer")}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Farmer
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === chip.key ? "bg-emerald-900 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Main roster */}
          <div className="flex flex-col gap-3 xl:col-span-9">
            {roster.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No farmers match.</p>}
            {roster.map(({ farmer, latest }) => {
              const stageIndex = latest && !["rejected", "cancelled"].includes(latest.stage) ? STAGE_ORDER.indexOf(latest.stage) : -1;
              return (
                <article key={farmer.id} className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-white p-4 shadow-sm">
                  <div
                    className={`absolute bottom-0 left-0 top-0 w-1.5 ${latest ? STAGE_BAR_COLOR[latest.stage] : "bg-slate-200"}`}
                  />
                  <div className="flex flex-col gap-3 pl-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFarmerIds.has(farmer.id)}
                        onChange={() => toggleFarmer(farmer.id)}
                        className="mt-1 h-4 w-4 accent-emerald-800"
                      />
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{farmer.name}</h3>
                          {farmer.village && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{farmer.village}</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <a href={`tel:${farmer.phone}`} className="flex items-center gap-1 hover:text-emerald-800">
                            <span className="material-symbols-outlined text-[15px] text-emerald-700">call</span>
                            {farmer.phone}
                          </a>
                          {latest?.vehicleNumber && (
                            <span className="flex items-center gap-1 font-mono">
                              <span className="material-symbols-outlined text-[15px] text-amber-600">local_shipping</span>
                              {latest.vehicleNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {latest ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-500">{cropLabel(latest.crop, "en")}</span>
                          <span className="text-sm font-bold text-slate-900">
                            {latest.quantityQtl != null ? `${latest.quantityQtl} Qtl` : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-500">Slot</span>
                          <span className="font-mono text-xs font-bold text-emerald-800">
                            {latest.date} &middot; {latest.timeWindow}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No booking yet</span>
                    )}
                  </div>

                  {latest && stageIndex >= 0 && (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 p-3 pl-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-emerald-800">{STAGE_LABEL[latest.stage]}</span>
                        <span className="font-mono text-slate-500">Stage {stageIndex + 1}/5</span>
                      </div>
                      <div className="grid h-2 w-full grid-cols-5 gap-1 overflow-hidden rounded-full bg-slate-200">
                        {STAGE_ORDER.map((s, i) => (
                          <div key={s} className={i <= stageIndex ? "h-full bg-emerald-800" : "h-full bg-slate-200"} />
                        ))}
                      </div>
                    </div>
                  )}
                  {latest && (latest.gateNumber || latest.weighbridgeToken || latest.moisturePct != null || latest.jformNumber || latest.utrReference) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-[11px] text-slate-500">
                      {latest.gateNumber && <span>Gate {latest.gateNumber}</span>}
                      {latest.weighbridgeToken && <span>Token {latest.weighbridgeToken}</span>}
                      {latest.moisturePct != null && <span>Moisture {latest.moisturePct}%</span>}
                      {latest.jformNumber && <span>J-Form {latest.jformNumber}</span>}
                      {latest.utrReference && <span>UTR {latest.utrReference}</span>}
                    </div>
                  )}
                  {latest && (latest.stage === "rejected" || latest.stage === "cancelled") && (
                    <div className="rounded-lg bg-red-50 p-2.5 pl-2 text-xs font-bold text-red-800">
                      {STAGE_LABEL[latest.stage]}
                      {latest.rejectReason ? `: ${latest.rejectReason}` : ""}
                    </div>
                  )}

                  {latest && (
                    <div className="flex items-center justify-between pl-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPassModalFarmerId(farmer.id)}
                          className="flex items-center gap-1.5 rounded bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-200"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          View Pass
                        </button>
                        {latest.stage === "paid" && latest.amountPaid != null && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                            <span className="material-symbols-outlined text-[15px]">account_balance</span>
                            Paid ₹{latest.amountPaid.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">#{latest.refCode}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-5 xl:col-span-3">
            <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-800">calendar_add_on</span>
                <h3 className="text-sm font-bold text-slate-900">Batch Slot Booking</h3>
              </div>

              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-2.5 text-xs">
                <span className="text-slate-500">Free slots for selection</span>
                <span className="font-mono text-lg font-bold text-emerald-800">{selectedCentreFreeSlots} available</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Crop</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  {CROPS.map((c) => (
                    <option key={c} value={c}>
                      {cropLabel(c, "en")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Mandi Centre</label>
                <select
                  value={centreId}
                  onChange={(e) => setCentreId(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Date</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  {days.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Time Window</label>
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  {timeWindows.map((w) => (
                    <option key={w.timeWindow} value={w.timeWindow} disabled={w.availableSlots === 0}>
                      {w.timeWindow} ({w.availableSlots} left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Target Farmers</label>
                <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                  {selectedFarmerIds.size === 0 && <span className="text-xs text-slate-400">Select farmers from the roster</span>}
                  {Array.from(selectedFarmerIds).map((id) => {
                    const f = farmers?.find((x) => x.id === id);
                    if (!f) return null;
                    return (
                      <span key={id} className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[12px] font-medium text-slate-800 shadow-xs">
                        {f.name}
                        <button type="button" onClick={() => toggleFarmer(id)} className="text-slate-400 hover:text-red-600">
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={booking || selectedFarmerIds.size === 0 || !timeWindow}
                onClick={handleBatchBook}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-900 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Confirm Batch
              </button>

              {batchResult && (
                <p className="text-xs font-medium text-slate-700">
                  Booked {batchResult.booked}.{" "}
                  {batchResult.skipped.length > 0 && `${batchResult.skipped.length} skipped (centre full for this slot).`}
                </p>
              )}
            </div>

            {agentInfo?.centreId && (
              <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-emerald-800">warehouse</span>
                    <h3 className="text-sm font-bold text-slate-900">Yard Status</h3>
                  </div>
                  {!editingYard && (
                    <button type="button" onClick={() => setEditingYard(true)} className="text-xs font-bold text-emerald-800 hover:underline">
                      {yardStatus?.updatedAt ? "Update" : "Report"}
                    </button>
                  )}
                </div>
                <p className="-mt-2 text-[11px] text-slate-400">
                  Agent-reported, not a live sensor feed.
                  {yardStatus?.updatedAt && (
                    <>
                      {" "}
                      Last updated by {yardStatus.updatedByAgentName ?? "an agent"} on{" "}
                      {new Date(yardStatus.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.
                    </>
                  )}
                </p>

                {editingYard ? (
                  <form onSubmit={handleSaveYardStatus} className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        Lanes occupied
                        <input
                          type="number"
                          min={0}
                          value={yardForm.lanesOccupied}
                          onChange={(e) => setYardForm((f) => ({ ...f, lanesOccupied: e.target.value }))}
                          className="h-9 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        Lanes total
                        <input
                          type="number"
                          min={0}
                          value={yardForm.lanesTotal}
                          onChange={(e) => setYardForm((f) => ({ ...f, lanesTotal: e.target.value }))}
                          className="h-9 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        Gunny stock %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={yardForm.gunnyStock}
                          onChange={(e) => setYardForm((f) => ({ ...f, gunnyStock: e.target.value }))}
                          className="h-9 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        Storage lifting %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={yardForm.storageLifting}
                          onChange={(e) => setYardForm((f) => ({ ...f, storageLifting: e.target.value }))}
                          className="h-9 rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingYard}
                        className="h-9 flex-1 rounded-lg bg-emerald-900 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingYard(false)}
                        className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="block text-[11px] text-slate-500">Weighbridge lanes</span>
                      <span className="font-mono font-bold text-slate-900">
                        {yardStatus ? `${yardStatus.weighbridgeLanesOccupied}/${yardStatus.weighbridgeLanesTotal}` : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <span className="block text-[11px] text-slate-500">Gunny bag stock</span>
                      <span className="font-mono font-bold text-slate-900">{yardStatus?.gunnyBagStockPct != null ? `${yardStatus.gunnyBagStockPct}%` : "—"}</span>
                    </div>
                    <div className="col-span-2 rounded-lg bg-slate-50 p-2.5">
                      <span className="block text-[11px] text-slate-500">Storage lifting</span>
                      <span className="font-mono font-bold text-slate-900">{yardStatus?.storageLiftingPct != null ? `${yardStatus.storageLiftingPct}%` : "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl bg-slate-100 p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-800">support_agent</span>
                <h3 className="text-sm font-bold text-slate-900">Support Desk</h3>
              </div>
              <p className="text-xs text-slate-600">24x7 Kisan &amp; Arhtiya Helpline</p>
              <a
                href="tel:18001802060"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                1800-180-2060
              </a>
              <div className="mt-1 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-600">Gate Supervisor Desk{centre ? ` · ${centre.name}` : ""}</p>
                {centre?.gateSupervisorPhone ? (
                  <a
                    href={`tel:${centre.gateSupervisorPhone}`}
                    className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    {centre.gateSupervisorPhone}
                  </a>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-400">Not configured for this centre yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {passModalEntry?.latest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          onClick={() => setPassModalFarmerId(null)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-emerald-900 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                <span className="text-sm font-bold">Digital Mandi Gate Pass</span>
              </div>
              <button type="button" onClick={() => setPassModalFarmerId(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500">Farmer Name</span>
                  <span className="text-base font-bold text-slate-900">{passModalEntry.farmer.name}</span>
                  <span className="font-mono text-xs font-bold text-emerald-800">#{passModalEntry.latest.refCode}</span>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded border border-slate-200 bg-white text-slate-400">
                  <span className="material-symbols-outlined text-[32px]">qr_code_2</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="block text-[11px] text-slate-500">Vehicle</span>
                  <p className="font-mono text-sm font-bold text-slate-900">{passModalEntry.latest.vehicleNumber ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="block text-[11px] text-slate-500">Quantity</span>
                  <p className="font-mono text-sm font-bold text-emerald-800">
                    {passModalEntry.latest.quantityQtl != null ? `${passModalEntry.latest.quantityQtl} Qtl` : "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="block text-[11px] text-slate-500">Slot</span>
                <p className="text-sm font-bold text-slate-900">
                  {passModalEntry.latest.date} &middot; {passModalEntry.latest.timeWindow}
                  {centre ? ` · ${centre.name}` : ""}
                </p>
              </div>
              {(passModalEntry.latest.gateNumber || passModalEntry.latest.weighbridgeToken || passModalEntry.latest.moisturePct != null) && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Gate</span>
                    <p className="font-mono text-sm font-bold text-slate-900">{passModalEntry.latest.gateNumber ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Token</span>
                    <p className="font-mono text-sm font-bold text-slate-900">{passModalEntry.latest.weighbridgeToken ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Moisture</span>
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {passModalEntry.latest.moisturePct != null ? `${passModalEntry.latest.moisturePct}%` : "—"}
                    </p>
                  </div>
                </div>
              )}
              {(passModalEntry.latest.jformNumber || passModalEntry.latest.utrReference) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">J-Form No.</span>
                    <p className="font-mono text-sm font-bold text-slate-900">{passModalEntry.latest.jformNumber ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">UTR Reference</span>
                    <p className="font-mono text-sm font-bold text-slate-900">{passModalEntry.latest.utrReference ?? "—"}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setPassModalFarmerId(null)}
                className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
