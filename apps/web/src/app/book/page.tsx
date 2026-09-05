"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Centre, CentreCapacityWithAvailability } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { CROPS, cropLabel } from "@/lib/crops";
import { t } from "@/lib/i18n";
import { ApiError } from "@/lib/api";

type Step = "crop" | "centre" | "day" | "time" | "confirm";

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

export default function BookSlotPage() {
  const { authFetch } = useAuth();
  const { farmer } = useFarmerProfile();
  const router = useRouter();
  const language = farmer?.language ?? "en";

  const [step, setStep] = useState<Step>("crop");
  const [crop, setCrop] = useState<string | null>(null);
  const [centres, setCentres] = useState<Centre[] | null>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [timeWindows, setTimeWindows] = useState<CentreCapacityWithAvailability[] | null>(null);
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => nextDays(14), []);

  useEffect(() => {
    if (step !== "centre" || !crop) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres?crop=${crop}`);
      if (res.ok) {
        const { centres: list } = (await res.json()) as { centres: Centre[] };
        if (!cancelled) setCentres(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, crop, authFetch]);

  useEffect(() => {
    if (step !== "time" || !centre || !day) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres/${centre.id}/capacity?date=${day}`);
      if (res.ok) {
        const { time_windows: windows } = (await res.json()) as {
          time_windows: CentreCapacityWithAvailability[];
        };
        if (!cancelled) setTimeWindows(windows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, centre, day, authFetch]);

  async function handleConfirm() {
    if (!centre || !crop || !day || !timeWindow) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({ centreId: centre.id, crop, date: day, timeWindow }),
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

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        {step !== "crop" && (
          <button
            type="button"
            onClick={() => {
              if (step === "centre") setStep("crop");
              else if (step === "day") setStep("centre");
              else if (step === "time") setStep("day");
              else if (step === "confirm") setStep("time");
            }}
            className="mb-6 text-base font-medium text-green-800 underline underline-offset-2"
          >
            ← {t("back", language)}
          </button>
        )}

        {step === "crop" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold text-neutral-900">{t("selectCrop", language)}</h1>
            <div className="flex flex-col gap-4">
              {CROPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCrop(c);
                    setStep("centre");
                  }}
                  className="min-h-[60px] rounded-xl border-2 border-green-700 bg-white px-6 text-xl font-semibold text-green-900 transition hover:bg-green-50"
                >
                  {cropLabel(c, language)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "centre" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold text-neutral-900">{t("selectCentre", language)}</h1>
            <div className="flex flex-col gap-4">
              {(centres ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCentre(c);
                    setStep("day");
                  }}
                  className="min-h-[60px] rounded-xl border-2 border-neutral-400 bg-white px-6 text-left text-lg font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  {c.name}
                  {c.district && <span className="block text-sm font-normal text-neutral-600">{c.district}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "day" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold text-neutral-900">{t("selectDay", language)}</h1>
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    setDay(d.date);
                    setStep("time");
                  }}
                  className="min-h-[60px] rounded-xl border-2 border-neutral-400 bg-white px-6 text-left text-lg font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "time" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold text-neutral-900">{t("selectTimeWindow", language)}</h1>
            <div className="flex flex-col gap-4">
              {(timeWindows ?? []).map((w) => (
                <button
                  key={w.timeWindow}
                  type="button"
                  disabled={w.availableSlots === 0}
                  onClick={() => {
                    setTimeWindow(w.timeWindow);
                    setStep("confirm");
                  }}
                  className="min-h-[60px] rounded-xl border-2 border-neutral-400 bg-white px-6 text-left text-lg font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  {w.timeWindow}
                  <span className="block text-sm font-normal">
                    {w.availableSlots > 0
                      ? `${w.availableSlots} ${t("slotsAvailable", language)}`
                      : t("slotsFull", language)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "confirm" && centre && crop && day && timeWindow && (
          <div>
            <h1 className="mb-6 text-2xl font-bold text-neutral-900">{t("confirmBooking", language)}</h1>
            <div className="mb-6 rounded-xl border-2 border-neutral-300 p-4 text-lg text-neutral-900">
              <p className="mb-1 font-semibold">{cropLabel(crop, language)}</p>
              <p className="mb-1">{centre.name}</p>
              <p className="mb-1">{days.find((d) => d.date === day)?.label}</p>
              <p>{timeWindow}</p>
            </div>
            {error && <p className="mb-4 text-base font-medium text-red-700">{error}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="min-h-[60px] w-full rounded-xl bg-green-700 text-xl font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
            >
              {t("confirmBooking", language)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
