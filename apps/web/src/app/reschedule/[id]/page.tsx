"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Booking, Centre, CentreCapacityWithAvailability, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { cropLabel } from "@/lib/crops";
import { LANGUAGES, t } from "@/lib/i18n";
import { ApiError } from "@/lib/api";

const REASONS = ["reasonHarvesterDelay", "reasonTransportBreakdown", "reasonMoistureDrying", "reasonWeatherRain"] as const;
const RESCHEDULE_CUTOFF_HOURS = 2;

interface DayOption {
  date: string;
  label: string;
}

interface AgentPublicInfo {
  id: string;
  name: string;
  phone: string | null;
}

function nextDays(count: number): DayOption[] {
  const days: DayOption[] = [];
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), label: formatter.format(d) });
  }
  return days;
}

function cutoffDate(date: string, timeWindow: string): Date {
  const start = timeWindow.split(/[-–]/)[0]?.trim();
  const cutoff = new Date(`${date}T${start}:00`);
  cutoff.setHours(cutoff.getHours() - RESCHEDULE_CUTOFF_HOURS);
  return cutoff;
}

export default function ReschedulePage() {
  const { user, logout, authFetch } = useAuth();
  const { farmer, setFarmer } = useFarmerProfile();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const language: Language = farmer?.language ?? "en";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [agent, setAgent] = useState<AgentPublicInfo | null>(null);
  const [languageSaving, setLanguageSaving] = useState(false);

  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0]);
  const [capacityByDate, setCapacityByDate] = useState<Record<string, CentreCapacityWithAvailability[]>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => nextDays(6), []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/bookings/${params.id}`);
      if (res.ok) {
        const { booking: b } = (await res.json()) as { booking: Booking };
        if (!cancelled) setBooking(b);
      } else if (!cancelled) {
        setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, authFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/centres");
      if (res.ok) {
        const { centres: list } = (await res.json()) as { centres: Centre[] };
        if (!cancelled) setCentres(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!farmer?.agentId) {
      setAgent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/agents/${farmer.agentId}`);
      if (res.ok) {
        const { agent: info } = (await res.json()) as { agent: AgentPublicInfo };
        if (!cancelled) setAgent(info);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmer?.agentId, authFetch]);

  // Fetch real capacity for the next few days up front, so date cards can show
  // real free-slot counts and picking a date needs no extra round trip.
  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        days.map(async (d) => {
          const res = await authFetch(`/centres/${booking.centreId}/capacity?date=${d.date}`);
          if (!res.ok) return [d.date, []] as const;
          const { time_windows: windows } = (await res.json()) as { time_windows: CentreCapacityWithAvailability[] };
          return [d.date, windows] as const;
        })
      );
      if (cancelled) return;
      const map: Record<string, CentreCapacityWithAvailability[]> = Object.fromEntries(entries);
      setCapacityByDate(map);
      const firstOpenDay = days.find((d) => (map[d.date] ?? []).some((w) => w.availableSlots > 0));
      const defaultDay = firstOpenDay?.date ?? days[0].date;
      setSelectedDay(defaultDay);
      const firstOpenWindow = (map[defaultDay] ?? []).find((w) => w.availableSlots > 0);
      setSelectedTimeWindow(firstOpenWindow?.timeWindow ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, authFetch]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleLanguageChange(lang: Language) {
    if (!user || languageSaving) return;
    setLanguageSaving(true);
    try {
      const res = await authFetch(`/farmers/${user.id}/language`, {
        method: "PUT",
        body: JSON.stringify({ language: lang }),
      });
      if (res.ok) {
        const { farmer: updated } = await res.json();
        setFarmer(updated);
      }
    } finally {
      setLanguageSaving(false);
    }
  }

  const bookingCentre = booking ? centres.find((c) => c.id === booking.centreId) ?? null : null;
  const cutoffPassed = booking ? now > cutoffDate(booking.date, booking.timeWindow) : false;
  const cutoffAt = booking ? cutoffDate(booking.date, booking.timeWindow) : null;
  const hoursLeft = cutoffAt ? Math.max(0, Math.floor((cutoffAt.getTime() - now.getTime()) / 3_600_000)) : 0;
  const minutesLeft = cutoffAt ? Math.max(0, Math.floor(((cutoffAt.getTime() - now.getTime()) % 3_600_000) / 60_000)) : 0;

  const selectedDayLabel = days.find((d) => d.date === selectedDay)?.label ?? "";

  async function handleConfirm() {
    if (!booking || !selectedDay || !selectedTimeWindow) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/bookings/${booking.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          centreId: booking.centreId,
          date: selectedDay,
          timeWindow: selectedTimeWindow,
          reason: t(reason, language),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong, please try again");
        return;
      }
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return <CenteredMessage>Booking not found.</CenteredMessage>;
  }
  if (!booking) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }
  if (booking.stage !== "booked") {
    return <CenteredMessage>This slot can no longer be rescheduled.</CenteredMessage>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 w-full border-b border-emerald-900 bg-[#00261d] text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="grid h-9 w-9 shrink-0 rotate-45 place-items-center rounded bg-amber" aria-hidden />
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold uppercase tracking-wide text-white">Fasal Slot</span>
                <span className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  RMS 2026-27
                </span>
              </div>
              <span className="mt-0.5 text-xs font-medium text-emerald-200">ਫ਼ਸਲ ਸਲਾਟ ਈ-ਖ਼ਰੀਦ ਪੋਰਟਲ</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:18001802060"
              className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 font-mono text-xs text-white"
            >
              <span className="material-symbols-outlined text-[18px] text-red-400">support_agent</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase leading-none text-red-300">24x7 Kisan Helpline</span>
                <span className="font-bold tracking-wider">1800-180-2060</span>
              </div>
            </a>

            <div className="flex items-center rounded-lg border border-white/10 bg-white/10 p-0.5 text-xs font-medium">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={languageSaving}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`rounded px-2.5 py-1 transition disabled:opacity-60 ${
                    language === lang.code ? "bg-emerald-600 font-bold text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-l border-white/15 pl-3">
              <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-400/50 bg-emerald-600 text-sm font-bold text-white">
                {(farmer?.name ?? user?.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-xs font-bold text-white xl:block">{farmer?.name ?? user?.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("logout", language)}
                className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="material-symbols-outlined text-[19px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <a href="/home" className="flex items-center gap-1 hover:text-emerald-800">
            <span className="material-symbols-outlined text-[16px]">home</span>
            Dashboard
          </a>
          <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
          <a href="/home" className="hover:text-emerald-800">
            #{booking.refCode}
          </a>
          <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">{t("rescheduleTitle", language)}</span>
        </div>

        {/* Policy banner */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 p-4 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-600 text-white shadow-sm">
              <span className="material-symbols-outlined text-[26px]">gavel</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900">{t("rescheduleTitle", language)}</span>
              <p className="mt-0.5 text-xs text-slate-600">{t("rescheduleCutoffNotice", language)}</p>
              {!cutoffPassed && (
                <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                  {cropLabel(booking.crop, language)}
                  {booking.quantityQtl != null && ` · ${booking.quantityQtl} Qtl`} remains securely locked.
                </p>
              )}
            </div>
          </div>
          {!cutoffPassed && (
            <div className="flex shrink-0 items-center gap-3 self-end rounded-lg border border-amber-200 bg-white px-4 py-2.5 shadow-xs md:self-center">
              <span className="material-symbols-outlined text-[24px] text-amber-700">hourglass_top</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Time Left to Shift</span>
                <span className="font-mono text-lg font-extrabold leading-none text-amber-700">
                  {hoursLeft.toString().padStart(2, "0")}h : {minutesLeft.toString().padStart(2, "0")}m
                </span>
              </div>
            </div>
          )}
        </div>

        {cutoffPassed ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">{t("rescheduleCutoffPassed", language)}</p>
            <a href="tel:18001802060" className="mt-2 inline-block font-bold text-red-900 underline">
              1800-180-2060
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT: form */}
            <div className="flex flex-col gap-5 lg:col-span-8">
              {/* Step 1: reason */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">1</span>
                    <h2 className="text-base font-bold text-slate-900">{t("reasonForShift", language)}</h2>
                  </div>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-800">
                    * Mandatory
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-lg border-2 p-3.5 text-left text-sm font-bold transition ${
                        reason === r ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      {t(r, language)}
                    </button>
                  ))}
                </div>
              </section>

              {/* Step 2: date */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">2</span>
                    <h2 className="text-base font-bold text-slate-900">{t("rescheduleSelectDate", language)}</h2>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                    <span className="material-symbols-outlined text-[15px]">event_available</span>
                    Real-time Quota Sync
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {days.map((d) => {
                    const windows = capacityByDate[d.date] ?? [];
                    const free = windows.reduce((sum, w) => sum + w.availableSlots, 0);
                    const active = selectedDay === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          setSelectedDay(d.date);
                          const firstOpen = (capacityByDate[d.date] ?? []).find((w) => w.availableSlots > 0);
                          setSelectedTimeWindow(firstOpen?.timeWindow ?? null);
                        }}
                        className={`flex min-h-[92px] flex-col justify-between rounded-xl border-2 p-3 text-left transition ${
                          active ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-900">{d.label}</span>
                        <span className={`font-mono text-xs font-bold ${free > 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {free > 0 ? `${free} slots free` : t("slotsFull", language)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 3: time window */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">3</span>
                    <h2 className="text-base font-bold text-slate-900">{t("rescheduleSelectTime", language)}</h2>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {(selectedDay ? capacityByDate[selectedDay] ?? [] : []).map((w) => {
                    const active = selectedTimeWindow === w.timeWindow;
                    return (
                      <button
                        key={w.timeWindow}
                        type="button"
                        disabled={w.availableSlots === 0}
                        onClick={() => setSelectedTimeWindow(w.timeWindow)}
                        className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          active ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-900">{w.timeWindow}</span>
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {w.availableSlots > 0 ? `${w.availableSlots} ${t("slotsAvailable", language)}` : t("slotsFull", language)}
                        </span>
                      </button>
                    );
                  })}
                  {selectedDay && (capacityByDate[selectedDay] ?? []).length === 0 && (
                    <p className="text-sm text-slate-500">No time windows configured for this date.</p>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT: sticky sidebar */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:col-span-4">
              {/* Active pass */}
              <div className="relative overflow-hidden rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-900 to-[#0c3b2d] p-5 text-white shadow-md">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">Active Gate Pass</span>
                  <span className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
                    Will Replace
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2.5">
                    <span className="block text-[10px] uppercase text-emerald-200">Crop</span>
                    <span className="text-sm font-bold">{cropLabel(booking.crop, language)}</span>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2.5">
                    <span className="block text-[10px] uppercase text-emerald-200">Load</span>
                    <span className="text-sm font-bold">{booking.quantityQtl != null ? `~${booking.quantityQtl} Qtl` : "—"}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/10 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-300">warehouse</span>
                    <span className="font-bold">{bookingCentre?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-white/10 pt-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-300">schedule</span>
                    <span className="font-mono font-bold">
                      {booking.date} · {booking.timeWindow}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Comparison</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Zero Penalty</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                  <span className="text-slate-500">{t("oldSchedule", language)}</span>
                  <span className="font-mono font-medium text-red-700 line-through">
                    {booking.date} · {booking.timeWindow}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs">
                  <span className="font-bold text-emerald-950">{t("newSchedule", language)}</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {selectedDay ? `${selectedDayLabel} · ${selectedTimeWindow ?? "—"}` : "—"}
                  </span>
                </div>

                {agent && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{t("assignedArhtiya", language)}</span>
                      <span className="font-bold text-slate-900">{agent.name}</span>
                    </div>
                    {agent.phone && (
                      <a
                        href={`tel:${agent.phone}`}
                        className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-800 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                      </a>
                    )}
                  </div>
                )}

                {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                <div className="mt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={submitting || !selectedDay || !selectedTimeWindow}
                    onClick={handleConfirm}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    {t("confirmReschedule", language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/home")}
                    className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    {t("keepCurrentSlot", language)}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="font-body text-lg text-slate-600">{children}</p>
    </div>
  );
}
