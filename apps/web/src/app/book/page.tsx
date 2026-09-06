"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Centre, CentreCapacityWithAvailability } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { CROPS, cropLabel } from "@/lib/crops";
import { t } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { BrandBar } from "@/components/BrandBar";
import { mspRate } from "@/lib/msp";

type Step = "crop" | "quantity" | "centre" | "day" | "time" | "vehicle" | "confirm";

interface DayOption {
  date: string;
  label: string;
}

function nextDays(count: number): DayOption[] {
  const days: DayOption[] = [];
  const formatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), label: formatter.format(d) });
  }
  return days;
}

function nextDaysShort(count: number): DayOption[] {
  const days: DayOption[] = [];
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), label: formatter.format(d) });
  }
  return days;
}

export default function BookSlotPage() {
  const { authFetch } = useAuth();
  const { farmer } = useFarmerProfile();
  const router = useRouter();
  const language = farmer?.language ?? "en";

  // Shared state (used by both mobile wizard and desktop single-page form)
  const [crop, setCrop] = useState<string>("wheat");
  const [quantityQtl, setQuantityQtl] = useState<number>(65);
  const [centres, setCentres] = useState<Centre[] | null>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [moistureDeclared, setMoistureDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile wizard-only state
  const [step, setStep] = useState<Step>("crop");
  const [mobileTimeWindows, setMobileTimeWindows] = useState<CentreCapacityWithAvailability[] | null>(null);

  // Desktop-only state: capacity pre-fetched for the next few days at once
  const [capacityByDate, setCapacityByDate] = useState<Record<string, CentreCapacityWithAvailability[]>>({});

  const days = useMemo(() => nextDays(14), []);
  const shortDays = useMemo(() => nextDaysShort(6), []);

  // Fetch centres whenever crop changes (both layouts need this)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres?crop=${crop}`);
      if (res.ok) {
        const { centres: list } = (await res.json()) as { centres: Centre[] };
        if (!cancelled) {
          setCentres(list);
          setCentre((prev) => prev ?? list[0] ?? null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crop, authFetch]);

  // Mobile: fetch a single day's time windows only once that step is reached
  useEffect(() => {
    if (step !== "time" || !centre || !day) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres/${centre.id}/capacity?date=${day}`);
      if (res.ok) {
        const { time_windows: windows } = (await res.json()) as {
          time_windows: CentreCapacityWithAvailability[];
        };
        if (!cancelled) setMobileTimeWindows(windows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, centre, day, authFetch]);

  // Desktop: pre-fetch capacity for the next 6 days as soon as a centre is picked,
  // so date cards can show real free-slot counts and picking a date needs no round trip.
  useEffect(() => {
    if (!centre) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        shortDays.map(async (d) => {
          const res = await authFetch(`/centres/${centre.id}/capacity?date=${d.date}`);
          if (!res.ok) return [d.date, []] as const;
          const { time_windows: windows } = (await res.json()) as { time_windows: CentreCapacityWithAvailability[] };
          return [d.date, windows] as const;
        })
      );
      if (cancelled) return;
      const map: Record<string, CentreCapacityWithAvailability[]> = Object.fromEntries(entries);
      setCapacityByDate(map);
      setDay((prevDay) => {
        if (prevDay && map[prevDay]?.some((w) => w.availableSlots > 0)) return prevDay;
        const firstOpen = shortDays.find((d) => (map[d.date] ?? []).some((w) => w.availableSlots > 0));
        return firstOpen?.date ?? shortDays[0].date;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centre, authFetch]);

  useEffect(() => {
    if (!day) return;
    setTimeWindow((prevWindow) => {
      const windows = capacityByDate[day] ?? [];
      if (prevWindow && windows.some((w) => w.timeWindow === prevWindow && w.availableSlots > 0)) return prevWindow;
      return windows.find((w) => w.availableSlots > 0)?.timeWindow ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, capacityByDate]);

  async function handleConfirm() {
    if (!centre || !crop || !day || !timeWindow || !moistureDeclared) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          centreId: centre.id,
          crop,
          date: day,
          timeWindow,
          quantityQtl,
          vehicleNumber: vehicleNumber.trim() || null,
          driverName: driverName.trim() || null,
          moistureDeclared,
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

  const STEP_ORDER: Step[] = ["crop", "quantity", "centre", "day", "time", "vehicle", "confirm"];
  const stepIndex = STEP_ORDER.indexOf(step);
  const selectedDayLabel = days.find((d) => d.date === day)?.label ?? shortDays.find((d) => d.date === day)?.label ?? "";
  const estimatedPayout = quantityQtl * mspRate(crop);

  return (
    <div className="min-h-screen bg-chalk">
      {/* MOBILE WIZARD (below lg) */}
      <div className="lg:hidden">
        <BrandBar />
        <div className="flex flex-col items-center px-6 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex items-center gap-2">
              {STEP_ORDER.map((s, i) => (
                <span
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all ${i <= stepIndex ? "bg-canopy" : "bg-slate-300"}`}
                />
              ))}
            </div>

            {step !== "crop" && (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = STEP_ORDER.indexOf(step);
                  if (currentIndex > 0) setStep(STEP_ORDER[currentIndex - 1]);
                }}
                className="mb-6 font-sans text-base font-bold text-canopy underline underline-offset-2"
              >
                ← {t("back", language)}
              </button>
            )}

            {step === "crop" && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("selectCrop", language)}</h1>
                <div className="flex flex-col gap-4">
                  {CROPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCrop(c);
                        setCentre(null);
                        setStep("quantity");
                      }}
                      className="min-h-[60px] rounded-lg border-[1.5px] border-canopy bg-white px-6 font-sans text-xl font-bold text-canopy transition hover:bg-canopy/5 active:translate-y-0.5"
                    >
                      {cropLabel(c, language)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "quantity" && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("quantityStepTitle", language)}</h1>
                <div className="mb-4 flex flex-col gap-3">
                  {[
                    { label: t("oneTrolley", language), qtl: 65 },
                    { label: t("twoTrolleys", language), qtl: 130 },
                  ].map((opt) => (
                    <button
                      key={opt.qtl}
                      type="button"
                      onClick={() => setQuantityQtl(opt.qtl)}
                      className={`min-h-[60px] rounded-lg border-[1.5px] px-6 text-left font-sans text-lg font-bold transition active:translate-y-0.5 ${
                        quantityQtl === opt.qtl
                          ? "border-canopy bg-canopy/5 text-canopy"
                          : "border-slate-500 bg-white text-slate-ink hover:bg-chalk"
                      }`}
                    >
                      {opt.label}
                      <span className="block font-mono text-sm font-normal">
                        ~{opt.qtl} {t("quintalsUnit", language)}
                      </span>
                    </button>
                  ))}
                </div>
                <label className="mb-2 block font-sans text-sm font-semibold text-slate-700">{t("customQuantity", language)}</label>
                <div className="mb-6 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={quantityQtl}
                    onChange={(e) => setQuantityQtl(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
                    className="min-h-[56px] w-32 rounded-lg border-[1.5px] border-slate-500 px-4 text-center font-mono text-xl font-bold text-slate-ink focus:border-canopy focus:outline-none focus:ring-2 focus:ring-canopy/30"
                  />
                  <span className="font-sans text-lg font-bold text-slate-600">{t("quintalsUnit", language)}</span>
                </div>
                <div className="mb-6 rounded-lg border-[1.5px] border-slate-300 bg-white p-4">
                  <div className="flex items-center justify-between font-sans text-base">
                    <span className="text-slate-600">{t("estimatedPayout", language)}</span>
                    <span className="font-mono text-lg font-bold text-canopy">₹{estimatedPayout.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="mt-1 font-body text-xs text-slate-500">{t("estimatedPayoutNote", language)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("centre")}
                  className="min-h-[60px] w-full rounded-lg bg-canopy font-sans text-xl font-bold text-white shadow-token transition hover:bg-canopy-deep active:translate-y-1 active:shadow-none"
                >
                  {t("continue", language)}
                </button>
              </div>
            )}

            {step === "centre" && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("selectCentre", language)}</h1>
                <div className="flex flex-col gap-4">
                  {(centres ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCentre(c);
                        setStep("day");
                      }}
                      className="min-h-[60px] rounded-lg border-[1.5px] border-slate-500 bg-white px-6 text-left font-sans text-lg font-bold text-slate-ink transition hover:bg-chalk active:translate-y-0.5"
                    >
                      {c.name}
                      {c.district && <span className="block font-body text-sm font-normal text-slate-600">{c.district}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "day" && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("selectDay", language)}</h1>
                <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => {
                        setDay(d.date);
                        setStep("time");
                      }}
                      className="min-h-[60px] rounded-lg border-[1.5px] border-slate-500 bg-white px-6 text-left font-sans text-lg font-bold text-slate-ink transition hover:bg-chalk active:translate-y-0.5"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "time" && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("selectTimeWindow", language)}</h1>
                <div className="flex flex-col gap-4">
                  {(mobileTimeWindows ?? []).map((w) => (
                    <button
                      key={w.timeWindow}
                      type="button"
                      disabled={w.availableSlots === 0}
                      onClick={() => {
                        setTimeWindow(w.timeWindow);
                        setStep("vehicle");
                      }}
                      className="min-h-[60px] rounded-lg border-[1.5px] border-slate-500 bg-white px-6 text-left font-sans text-lg font-bold text-slate-ink transition hover:bg-chalk active:translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:translate-y-0"
                    >
                      {w.timeWindow}
                      <span className="block font-mono text-sm font-normal">
                        {w.availableSlots > 0 ? `${w.availableSlots} ${t("slotsAvailable", language)}` : t("slotsFull", language)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "vehicle" && (
              <div>
                <h1 className="mb-2 font-sans text-2xl font-bold text-slate-ink">{t("vehicleStepTitle", language)}</h1>
                <label className="mb-1 mt-4 block font-sans text-sm font-semibold text-slate-700">
                  {t("vehicleNumberLabel", language)}
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="PB-02-BV-4419"
                  className="mb-4 min-h-[56px] w-full rounded-lg border-[1.5px] border-slate-500 px-4 font-mono text-lg text-slate-ink placeholder:text-slate-400 focus:border-canopy focus:outline-none focus:ring-2 focus:ring-canopy/30"
                />
                <label className="mb-1 block font-sans text-sm font-semibold text-slate-700">{t("driverNameLabel", language)}</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="mb-6 min-h-[56px] w-full rounded-lg border-[1.5px] border-slate-500 px-4 text-lg text-slate-ink focus:border-canopy focus:outline-none focus:ring-2 focus:ring-canopy/30"
                />
                <label className="mb-6 flex items-start gap-3 rounded-lg border-[1.5px] border-amber/40 bg-amber/5 p-4">
                  <input
                    type="checkbox"
                    checked={moistureDeclared}
                    onChange={(e) => setMoistureDeclared(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-canopy focus:ring-canopy"
                  />
                  <span className="font-body text-sm text-slate-ink">{t("moistureDeclaration", language)}</span>
                </label>
                <button
                  type="button"
                  disabled={!moistureDeclared}
                  onClick={() => setStep("confirm")}
                  className="min-h-[60px] w-full rounded-lg bg-canopy font-sans text-xl font-bold text-white shadow-token transition hover:bg-canopy-deep active:translate-y-1 active:shadow-none disabled:opacity-60"
                >
                  {t("continue", language)}
                </button>
              </div>
            )}

            {step === "confirm" && centre && crop && day && timeWindow && (
              <div>
                <h1 className="mb-6 font-sans text-2xl font-bold text-slate-ink">{t("confirmBooking", language)}</h1>
                <div className="mb-6 flex flex-col gap-2 rounded-lg border-[1.5px] border-slate-300 bg-white p-4 text-lg text-slate-ink">
                  <p className="font-sans font-bold">{cropLabel(crop, language)}</p>
                  <p className="font-body">{centre.name}</p>
                  <p className="font-body">{days.find((d) => d.date === day)?.label}</p>
                  <p className="font-mono">{timeWindow}</p>
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="font-body text-base">
                      {t("quantityLabel", language)}:{" "}
                      <span className="font-mono font-bold">
                        {quantityQtl} {t("quintalsUnit", language)}
                      </span>
                    </p>
                    {vehicleNumber && (
                      <p className="font-body text-base">
                        {t("vehicleLabel", language)}: <span className="font-mono">{vehicleNumber}</span>
                      </p>
                    )}
                    {driverName && (
                      <p className="font-body text-base">
                        {t("driverLabel", language)}: <span className="font-body">{driverName}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-sans font-semibold text-slate-700">{t("estimatedPayout", language)}</span>
                    <span className="font-mono text-xl font-bold text-canopy">₹{estimatedPayout.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                {error && <p className="mb-4 font-body text-base font-medium text-[#991B1B]">{error}</p>}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirm}
                  className="min-h-[60px] w-full rounded-lg bg-canopy font-sans text-xl font-bold text-white shadow-token transition hover:bg-canopy-deep active:translate-y-1 active:shadow-none disabled:opacity-60"
                >
                  {t("confirmBooking", language)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP SINGLE-PAGE FORM (lg and up) */}
      <div className="hidden lg:block">
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
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs">
              <span className="text-emerald-200">MSP</span>
              <span className="font-bold text-amber-300">₹{mspRate(crop).toLocaleString("en-IN")}/Qtl</span>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <a href="/home" className="flex items-center gap-1 hover:text-emerald-800">
              <span className="material-symbols-outlined text-[16px]">home</span>
              Dashboard
            </a>
            <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">{t("bookASlot", language)}</span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT: form */}
            <div className="flex flex-col gap-5 lg:col-span-8">
              {/* Step 1: crop & quantity */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">1</span>
                    <h2 className="text-base font-bold text-slate-900">{t("quantityStepTitle", language)}</h2>
                  </div>
                  <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-bold">
                    {CROPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCrop(c);
                          setCentre(null);
                        }}
                        className={`rounded px-3 py-1.5 transition ${
                          crop === c ? "bg-emerald-900 text-white" : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cropLabel(c, language)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { label: t("oneTrolley", language), qtl: 65 },
                    { label: t("twoTrolleys", language), qtl: 130 },
                  ].map((opt) => (
                    <button
                      key={opt.qtl}
                      type="button"
                      onClick={() => setQuantityQtl(opt.qtl)}
                      className={`flex flex-col justify-between rounded-xl border-2 p-4 text-left transition ${
                        quantityQtl === opt.qtl ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-base font-bold text-slate-900">{opt.label}</span>
                      <span className="mt-2 font-mono text-xl font-bold text-emerald-800">
                        ~{opt.qtl} <span className="text-sm font-normal text-slate-500">Qtl</span>
                      </span>
                    </button>
                  ))}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm font-bold text-slate-900">{t("customQuantity", language)}</span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={quantityQtl}
                        onChange={(e) => setQuantityQtl(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
                        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-lg font-bold text-emerald-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      />
                      <span className="text-sm font-bold text-slate-600">{t("quintalsUnit", language)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-sm text-slate-600">{t("estimatedPayout", language)}</span>
                  <span className="font-mono text-lg font-bold text-emerald-900">₹{estimatedPayout.toLocaleString("en-IN")}</span>
                </div>
              </section>

              {/* Step 2: centre */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">2</span>
                  <h2 className="text-base font-bold text-slate-900">{t("selectCentre", language)}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(centres ?? []).map((c) => {
                    const active = centre?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCentre(c)}
                        className={`flex flex-col rounded-xl border-2 p-4 text-left transition ${
                          active ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        {c.district && <span className="text-xs text-slate-500">{c.district}</span>}
                      </button>
                    );
                  })}
                  {centres && centres.length === 0 && <p className="text-sm text-slate-500">No centres available for this crop.</p>}
                </div>
              </section>

              {/* Step 3: date & time */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">3</span>
                    <h2 className="text-base font-bold text-slate-900">{t("selectDay", language)}</h2>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                    <span className="material-symbols-outlined text-[15px]">event_available</span>
                    Real-time Quota Sync
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {shortDays.map((d) => {
                    const windows = capacityByDate[d.date] ?? [];
                    const free = windows.reduce((sum, w) => sum + w.availableSlots, 0);
                    const active = day === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setDay(d.date)}
                        className={`flex min-h-[88px] flex-col justify-between rounded-xl border-2 p-3 text-left transition ${
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

                <h3 className="mt-2 text-sm font-bold text-slate-800">{t("selectTimeWindow", language)}</h3>
                <div className="flex flex-col gap-3">
                  {(day ? capacityByDate[day] ?? [] : []).map((w) => {
                    const active = timeWindow === w.timeWindow;
                    return (
                      <button
                        key={w.timeWindow}
                        type="button"
                        disabled={w.availableSlots === 0}
                        onClick={() => setTimeWindow(w.timeWindow)}
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
                  {day && (capacityByDate[day] ?? []).length === 0 && (
                    <p className="text-sm text-slate-500">No time windows configured for this date.</p>
                  )}
                </div>
              </section>

              {/* Step 4: vehicle & moisture */}
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-xs font-bold text-white">4</span>
                  <h2 className="text-base font-bold text-slate-900">{t("vehicleStepTitle", language)}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-800">{t("vehicleNumberLabel", language)}</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="PB-02-BV-4419"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-800">{t("driverNameLabel", language)}</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
                  <input
                    type="checkbox"
                    checked={moistureDeclared}
                    onChange={(e) => setMoistureDeclared(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-emerald-800 focus:ring-emerald-700"
                  />
                  <span className="text-sm text-amber-950">{t("moistureDeclaration", language)}</span>
                </label>
              </section>
            </div>

            {/* RIGHT: sticky summary */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:col-span-4">
              <div className="flex flex-col gap-3 rounded-xl border-2 border-emerald-800 bg-white p-5 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("confirmBooking", language)}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">RMS 2026-27</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t("colCrop", language)}</span>
                  <span className="font-bold text-slate-900">{cropLabel(crop, language)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t("quantityLabel", language)}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {quantityQtl} {t("quintalsUnit", language)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">MSP Rate</span>
                  <span className="font-mono font-bold text-emerald-900">₹{mspRate(crop).toLocaleString("en-IN")}/Qtl</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-2.5 text-sm">
                  <span className="font-semibold text-emerald-900">{t("estimatedPayout", language)}</span>
                  <span className="font-mono font-bold text-emerald-800">₹{estimatedPayout.toLocaleString("en-IN")}</span>
                </div>

                <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-800">warehouse</span>
                    <span className="font-bold text-slate-900">{centre?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-800">schedule</span>
                    <span className="font-mono font-bold text-slate-900">
                      {day ? `${selectedDayLabel} · ${timeWindow ?? "—"}` : "—"}
                    </span>
                  </div>
                  {vehicleNumber && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-800">local_shipping</span>
                      <span className="font-mono font-bold text-slate-900">{vehicleNumber}</span>
                    </div>
                  )}
                </div>

                {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                <button
                  type="button"
                  disabled={submitting || !centre || !day || !timeWindow || !moistureDeclared}
                  onClick={handleConfirm}
                  className="mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                  {t("confirmBooking", language)}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  {t("cancelBooking", language)}
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
