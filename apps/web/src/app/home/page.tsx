"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Booking, BookingStage, Centre, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { CentresList } from "@/components/CentresList";
import { LANGUAGES, t, type StringKey } from "@/lib/i18n";
import { cropLabel } from "@/lib/crops";

const ACTIVE_STAGES = new Set(["booked", "arrived", "weighed", "accepted"]);
const STAGE_ORDER: BookingStage[] = ["booked", "arrived", "weighed", "accepted", "paid"];
const STAGE_LABEL_KEY: Record<BookingStage, StringKey> = {
  booked: "stageBooked",
  arrived: "stageArrived",
  weighed: "stageWeighed",
  accepted: "stageAccepted",
  rejected: "stageRejected",
  paid: "stagePaid",
  cancelled: "stageCancelled",
};

interface AgentPublicInfo {
  id: string;
  name: string;
  phone: string | null;
}

export default function FarmerHomePage() {
  const { user, logout, authFetch } = useAuth();
  const { farmer, setFarmer } = useFarmerProfile();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [agent, setAgent] = useState<AgentPublicInfo | null>(null);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "mandi" | "profile">("history");

  useEffect(() => {
    if (!user || user.role !== "farmer") return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/farmers/${user.id}/bookings`);
      if (res.ok) {
        const { bookings: list } = (await res.json()) as { bookings: Booking[] };
        if (!cancelled) setBookings(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

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

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleLanguageChange(language: Language) {
    if (!user || languageSaving) return;
    setLanguageSaving(true);
    try {
      const res = await authFetch(`/farmers/${user.id}/language`, {
        method: "PUT",
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        const { farmer: updated } = await res.json();
        setFarmer(updated);
      }
    } finally {
      setLanguageSaving(false);
    }
  }

  const language: Language = farmer?.language ?? "en";
  const latestBooking = bookings?.[0] ?? null;
  const hasActiveBooking = latestBooking ? ACTIVE_STAGES.has(latestBooking.stage) : false;
  const bookingCentre = latestBooking ? centres.find((c) => c.id === latestBooking.centreId) ?? null : null;

  const stageIndex = latestBooking && !["rejected", "cancelled"].includes(latestBooking.stage)
    ? STAGE_ORDER.indexOf(latestBooking.stage)
    : -1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* MOBILE LAYOUT (below lg) */}
      <div className="flex min-h-screen flex-col lg:hidden">
      {/* FIXED HEADER */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">Fasal Slot</span>
                <span className="text-[11px] font-medium text-slate-500">फसल स्लॉट ई-प्रोक्योरमेंट</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:18001802060"
                className="flex items-center gap-1 rounded bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-800"
              >
                <span className="material-symbols-outlined text-[16px] text-red-600">call</span>
                1800-180-2060
              </a>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("logout", language)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-white"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-900">
              {t("welcome", language)}, {farmer?.name ?? user?.name ?? ""}
            </h1>
            <div className="flex items-center rounded bg-slate-100 p-0.5 text-xs font-semibold">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={languageSaving}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`rounded px-2 py-1.5 transition disabled:opacity-60 ${
                    language === lang.code ? "bg-emerald-800 text-white" : "text-slate-600"
                  }`}
                >
                  {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-24 pt-28">
        {/* Profile & Credentials Strip */}
        <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Link href="/profile" className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-800 text-lg font-bold text-white">
                {(farmer?.name ?? user?.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-base font-bold text-slate-900">{farmer?.name ?? user?.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {[farmer?.village, farmer?.district].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </Link>
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
              RABI 2026-27
            </span>
          </div>

          {/* Illustrative civic verification badges — not backed by a real verification system yet */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-emerald-800">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span className="text-[11px] font-bold leading-tight">Meri Fasal Verified</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-emerald-800">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span className="text-[11px] font-bold leading-tight">{t("aadhaarDbtReady", language)}</span>
            </div>
          </div>

          {/* Illustrative land/MSP snapshot — land holding & MSP rate aren't tracked yet, same numbers for every farmer */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">{t("registeredLand", language)}</span>
              <span className="font-bold text-slate-900">12 Acres</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[11px] text-slate-500">{t("wheatMspRate", language)}</span>
              <span className="font-bold text-emerald-800">₹2,425/Qtl</span>
            </div>
          </div>

          {agent && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="material-symbols-outlined shrink-0 text-[20px] text-amber">storefront</span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] leading-none text-slate-500">{t("assignedArhtiya", language)}</span>
                  <span className="truncate font-bold text-slate-900">{agent.name}</span>
                </div>
              </div>
              {agent.phone && (
                <a
                  href={`tel:${agent.phone}`}
                  aria-label={t("arhtiyaContact", language)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-emerald-800 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </a>
              )}
            </div>
          )}
        </section>

        {/* Active Gate Pass */}
        {latestBooking && hasActiveBooking && (
          <section id="gate-pass" className="overflow-hidden rounded-xl bg-emerald-900 text-white shadow-md">
            <div className="flex items-center justify-between bg-emerald-950 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                  RMS 2026-27 · {t("activeGatePass", language)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="block text-[11px] text-emerald-200">{t("tokenId", language)}</span>
                  <span className="font-mono text-lg font-bold tracking-wider">#{latestBooking.refCode}</span>
                </div>
                <span className="rounded bg-amber px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                  {stageIndex >= 0
                    ? `Stage ${stageIndex + 1}/5: ${t(STAGE_LABEL_KEY[latestBooking.stage], language)}`
                    : t(STAGE_LABEL_KEY[latestBooking.stage], language)}
                </span>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-white/10 p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber">pin_drop</span>
                  <div className="flex flex-col">
                    <span className="font-bold">{bookingCentre?.name ?? "—"}</span>
                    {bookingCentre?.district && (
                      <span className="text-[12px] text-emerald-200">{bookingCentre.district}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber">schedule</span>
                  <span className="font-mono text-sm font-bold">
                    {latestBooking.date} · {latestBooking.timeWindow}
                  </span>
                </div>
              </div>

              {/* Illustrative live queue position — not tracked in real time yet */}
              <div className="flex items-center justify-between rounded-lg bg-white p-3 text-slate-900">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px] text-amber">local_shipping</span>
                  <span className="text-sm font-bold">{t("trolleysAheadInLine", language)}</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber">~35m</span>
              </div>

              <button
                type="button"
                onClick={() => setTokenModalOpen(true)}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-amber font-bold text-white shadow"
              >
                <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                {t("viewTokenPass", language)}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {bookingCentre?.lat && bookingCentre?.lng ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${bookingCentre.lat},${bookingCentre.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[40px] items-center justify-center gap-1.5 rounded bg-white/15 text-[13px] font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px]">directions</span>
                    {t("gateMap", language)}
                  </a>
                ) : (
                  <span className="flex min-h-[40px] items-center justify-center gap-1.5 rounded bg-white/10 text-[13px] font-bold text-emerald-300/60">
                    {t("gateMap", language)}
                  </span>
                )}
                <Link
                  href={`/reschedule/${latestBooking.id}`}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded bg-white/15 text-[13px] font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                  {t("reschedule", language)}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Book Slot Hub */}
        {!hasActiveBooking && (
          <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-800">add_circle</span>
                <h2 className="font-bold text-slate-900">{t("bookASlot", language)}</h2>
              </div>
            </div>

            {!latestBooking && <p className="text-sm font-bold text-slate-800">{t("noBooking", language)}</p>}

            {/* Illustrative season quota — no per-farmer quota tracking exists yet */}
            <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 p-3">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Procured: 65 Qtl (27%)</span>
                <span className="font-bold text-emerald-800">Total Quota: 240 Qtl</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-800" style={{ width: "27%" }} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/book")}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 font-bold text-white shadow hover:bg-emerald-900"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
              {t("bookASlot", language)}
            </button>
          </section>
        )}

        {/* Illustrative live mandi advisory — no real telemetry for yard flow / moisture yet */}
        <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber">analytics</span>
            <h2 className="font-bold text-slate-900">{t("todaysMandiStatus", language)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block text-[11px] text-slate-500">{t("yardFlow", language)}</span>
              <span className="font-bold text-emerald-800">{t("yardFlowNormal", language)}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block text-[11px] text-slate-500">{t("avgClearance", language)}</span>
              <span className="font-bold text-slate-900">{t("avgClearanceValue", language)}</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-red-700">water_drop</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-red-800">{t("moistureNormTitle", language)}</span>
              <p className="mt-0.5 text-[12px] leading-tight text-slate-700">{t("moistureNormBody", language)}</p>
            </div>
          </div>
        </section>

        {/* Need Help */}
        <section className="mb-2 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-800">contact_support</span>
            <h2 className="font-bold text-slate-900">{t("needHelp", language)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:18001802060"
              className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-slate-50 p-2 text-[13px] font-bold text-emerald-800"
            >
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              {t("kisanHelpline", language)}
            </a>
            {agent?.phone ? (
              <a
                href={`tel:${agent.phone}`}
                className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-slate-50 p-2 text-[13px] font-bold text-emerald-800"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                {t("arhtiyaContact", language)}
              </a>
            ) : (
              <span className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-slate-50 p-2 text-[13px] font-bold text-slate-400">
                {t("arhtiyaContact", language)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber">sms</span>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-slate-900">{t("offlineSmsBooking", language)}</span>
                <span className="text-[11px] text-slate-500">
                  {t("offlineSmsSend", language)} <strong className="font-bold text-emerald-800">SLOT</strong>{" "}
                  {t("offlineSmsTo", language)} <strong className="font-bold text-slate-900">77382-99899</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {!hasActiveBooking && <CentresList language={language} />}
      </main>

      {/* FIXED BOTTOM NAV */}
      <nav className="fixed bottom-0 z-40 w-full border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          <a
            href={latestBooking && hasActiveBooking ? "#gate-pass" : undefined}
            aria-disabled={!(latestBooking && hasActiveBooking)}
            className={`flex flex-1 flex-col items-center gap-0.5 ${
              latestBooking && hasActiveBooking ? "text-slate-500" : "pointer-events-none text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
            <span className="text-[10px] font-bold uppercase">{t("myToken", language)}</span>
          </a>
          <span className="flex flex-1 flex-col items-center gap-0.5 font-bold text-emerald-800">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            <span className="text-[10px] font-bold uppercase">{t("bookSlotNav", language)}</span>
          </span>
          <Link href="/history" className="flex flex-1 flex-col items-center gap-0.5 text-slate-500">
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="text-[10px] font-bold uppercase">{t("history", language)}</span>
          </Link>
          <a href="tel:18001802060" className="flex flex-1 flex-col items-center gap-0.5 text-slate-500">
            <span className="material-symbols-outlined text-[22px]">support_agent</span>
            <span className="text-[10px] font-bold uppercase">{t("kisanHelpline", language)}</span>
          </a>
        </div>
      </nav>
      </div>

      {/* DESKTOP LAYOUT (lg and up) */}
      <div className="hidden min-h-screen lg:flex lg:flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-emerald-900 bg-[#00261d] text-white shadow-md">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
              <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
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
                <Link href="/profile" className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-400/50 bg-emerald-600 text-sm font-bold text-white">
                    {(farmer?.name ?? user?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden text-xs font-bold text-white xl:block">{farmer?.name ?? user?.name}</span>
                </Link>
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

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6">
          {/* Welcome bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-900 text-xl font-extrabold text-white shadow-sm">
                {(farmer?.name ?? user?.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-slate-900">{farmer?.name ?? user?.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                    <span className="material-symbols-outlined text-[15px] text-emerald-700">verified</span>
                    {t("verifiedGrower", language)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>{[farmer?.village, farmer?.district].filter(Boolean).join(", ") || "—"}</span>
                  {agent && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <span className="material-symbols-outlined text-[14px]">storefront</span>
                        {agent.name}
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-medium text-emerald-700">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    {t("aadhaarDbtReady", language)}
                  </span>
                </div>
              </div>
            </div>

            {/* Illustrative quota badge — no per-farmer quota tracking exists yet */}
            <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 shadow-xs">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/20 text-amber-800">
                <span className="material-symbols-outlined text-[22px]">inventory</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold leading-tight text-amber-900">{t("remainingQuota", language)}</span>
                <span className="font-mono text-lg font-black text-amber-800">175 Qtl</span>
              </div>
            </div>
          </div>

          {/* Dual hero cards */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            {/* Active Gate Pass */}
            {latestBooking && hasActiveBooking ? (
              <div className="flex flex-col justify-between gap-5 rounded-2xl border border-emerald-800 bg-gradient-to-br from-[#003629] via-[#094234] to-[#124d3e] p-6 text-white shadow-lg lg:col-span-7">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                      </span>
                      <span className="text-sm font-bold uppercase tracking-wide text-emerald-200">{t("activeGatePass", language)}</span>
                    </div>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                      {t("liveAndVerified", language)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-4">
                      <span className="text-xs font-medium text-emerald-200">{t("tokenId", language)}</span>
                      <div className="my-1 font-mono text-2xl font-black tracking-wider text-amber-300">#{latestBooking.refCode}</div>
                      <span className="font-mono text-xs text-white/80">
                        {cropLabel(latestBooking.crop, language)}
                        {latestBooking.quantityQtl != null && ` • ~${latestBooking.quantityQtl} Qtl`}
                      </span>
                    </div>
                    <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-4">
                      <div>
                        <span className="text-xs font-medium text-emerald-200">{t("gateMap", language)}</span>
                        <div className="mt-1 flex items-center gap-1.5 text-base font-bold text-white">
                          <span className="material-symbols-outlined text-[20px] text-amber-400">pin_drop</span>
                          <span>{bookingCentre?.name ?? "—"}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 text-xs font-medium text-amber-300">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span>
                          {latestBooking.date} · {latestBooking.timeWindow}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Illustrative live queue position — not tracked in real time yet */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-amber-500 bg-white p-4 text-slate-900 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-900">
                        <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{t("trolleysAheadAtWeighbridge", language)}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{t("estimatedWait35", language)}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-right">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">{t("turnTime", language)}</span>
                      <span className="font-mono text-base font-black leading-none text-amber-700">~10:15 AM</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setTokenModalOpen(true)}
                    className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow transition-colors hover:bg-amber-400"
                  >
                    <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
                    <span>{t("viewTokenPass", language)}</span>
                  </button>
                  {bookingCentre?.lat && bookingCentre?.lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${bookingCentre.lat},${bookingCentre.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/25"
                    >
                      <span className="material-symbols-outlined text-[20px]">near_me</span>
                      {t("gateMap", language)}
                    </a>
                  )}
                  <Link
                    href={`/reschedule/${latestBooking.id}`}
                    className="flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/25"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
                    {t("reschedule", language)}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm lg:col-span-7">
                <span className="material-symbols-outlined text-[40px] text-slate-300">confirmation_number</span>
                <p className="font-bold text-slate-700">{t("noBooking", language)}</p>
              </div>
            )}

            {/* Book New Slot */}
            <div className="flex flex-col justify-between gap-5 rounded-2xl border-2 border-emerald-700 bg-white p-6 shadow-md lg:col-span-5">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                    {t("bookASlot", language)}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500">RMS 2026-27</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold leading-tight text-slate-900">{t("bookNewSlotTitle", language)}</h2>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{t("colCrop", language)}</span>
                    <span className="font-bold text-slate-900">{cropLabel("wheat", language)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{t("mspRateLabel", language)}</span>
                    <span className="font-mono text-sm font-bold text-emerald-900">₹2,425 / Qtl</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs">
                    <span className="font-semibold text-amber-900">{t("remainingQuota", language)}</span>
                    <span className="font-mono text-sm font-black text-amber-700">175 Qtl</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/book")}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-800 active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                  {t("bookASlot", language)}
                </button>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-slate-500">phone_android</span>
                    {t("bookWithoutInternet", language)}
                  </span>
                  <a href="tel:18001802060" className="font-mono font-bold text-emerald-900 hover:underline">
                    1800-180-2060
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed detail section */}
          <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-emerald-900">dashboard_customize</span>
                <span className="text-base font-bold text-slate-900">{t("moreDetailsHistory", language)}</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {(
                  [
                    ["history", "receipt_long", "tabHistory"],
                    ["mandi", "analytics", "tabMandiStatus"],
                    ["profile", "person_pin", "tabProfile"],
                  ] as const
                ).map(([key, icon, labelKey]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
                      activeTab === key
                        ? "border-b-2 border-emerald-900 bg-white text-emerald-900"
                        : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    <span>{t(labelKey, language)}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "history" && (
              <div className="flex flex-col gap-4 p-6">
                {bookings === null && <p className="text-sm text-slate-500">{t("loadingGeneric", language)}</p>}
                {bookings && bookings.length === 0 && (
                  <p className="text-sm font-bold text-slate-800">{t("noBookingHistory", language)}</p>
                )}
                {bookings && bookings.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                          <th className="px-4 py-3">{t("colDateToken", language)}</th>
                          <th className="px-4 py-3">{t("colCrop", language)}</th>
                          <th className="px-4 py-3">{t("colMandiYard", language)}</th>
                          <th className="px-4 py-3 text-center">{t("moisturePercentCol", language)}</th>
                          <th className="px-4 py-3">{t("colStage", language)}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 bg-white text-slate-700">
                        {bookings.map((booking) => {
                          const centre = centres.find((c) => c.id === booking.centreId);
                          const isActive = ACTIVE_STAGES.has(booking.stage);
                          return (
                            <tr key={booking.id} className={isActive ? "bg-amber-50/30" : "hover:bg-slate-50"}>
                              <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                                <span className={isActive ? "font-black text-amber-800" : ""}>#{booking.refCode}</span>
                                <span className="block text-[11px] font-sans font-normal text-slate-500">{booking.date}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="font-semibold text-slate-900">{cropLabel(booking.crop, language)}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="font-medium text-slate-900">{centre?.name ?? "—"}</span>
                                {centre?.district && <span className="block text-[11px] text-slate-500">{centre.district}</span>}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {/* Illustrative — moisture readings aren't recorded yet */}
                                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                                  11.4% (Pass)
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                {booking.stage === "paid" ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                                    <span className="material-symbols-outlined text-[14px] text-emerald-700">verified</span>
                                    {booking.amountPaid != null
                                      ? `${t("paidViaDbtPrefix", language)} ₹${booking.amountPaid.toLocaleString("en-IN")}`
                                      : t(STAGE_LABEL_KEY[booking.stage], language)}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                      isActive ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />}
                                    {t(STAGE_LABEL_KEY[booking.stage], language)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "mandi" && (
              <div className="flex flex-col gap-4 p-6">
                {/* Illustrative — no real telemetry for yard flow / moisture yet */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-xs text-slate-500">{t("yardFlow", language)}</span>
                    <span className="text-lg font-bold text-emerald-800">{t("yardFlowNormal", language)}</span>
                    <p className="mt-1 text-xs text-slate-600">{t("currentWaitClearance", language)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-xs text-slate-500">{t("avgClearance", language)}</span>
                    <span className="text-lg font-bold text-slate-900">{t("avgClearanceValue", language)}</span>
                    <p className="mt-1 text-xs text-slate-600">{t("gunnyBagsAvailable", language)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-[22px] text-red-700">water_drop</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-red-800">{t("moistureNormTitle", language)}</span>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{t("moistureNormBody", language)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-bold text-slate-700">{t("registeredLandCrop", language)}</span>
                  <p className="text-sm text-slate-600">
                    {[farmer?.village, farmer?.district, farmer?.state].filter(Boolean).join(", ") || "—"}
                  </p>
                  {/* Illustrative — land holding size isn't tracked from a registry yet */}
                  <span className="text-xs font-semibold text-emerald-700">{t("landRegisteredNote", language)}</span>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-bold text-slate-700">{t("assignedArhtiya", language)}</span>
                  {agent ? (
                    <>
                      <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                      {agent.phone && (
                        <a href={`tel:${agent.phone}`} className="mp-mask flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          {agent.phone}
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="w-full border-t border-emerald-900 bg-[#001c15] py-6 text-emerald-200">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 text-xs md:flex-row">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">{t("footerPortalName", language)}</span>
              <span>•</span>
              <span>{t("footerNicBoard", language)}</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px] text-white/60">
              <span>{t("footerUidaiPfms", language)}</span>
              <span>•</span>
              <span>{t("footerTollFree", language)} 1800-180-2060</span>
            </div>
          </div>
        </footer>
      </div>

      {tokenModalOpen && latestBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-6"
          onClick={() => setTokenModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t("tokenId", language)}</p>
            <p className="mb-4 font-mono text-3xl font-extrabold tracking-wider text-emerald-900">
              #{latestBooking.refCode}
            </p>
            <p className="mb-1 font-bold text-slate-900">
              {cropLabel(latestBooking.crop, language)}
              {latestBooking.quantityQtl != null && ` • ${latestBooking.quantityQtl} Qtl`}
            </p>
            <p className="mb-4 font-mono text-sm text-slate-600">
              {latestBooking.date} · {latestBooking.timeWindow}
            </p>
            {bookingCentre && <p className="mb-6 text-sm text-slate-600">{bookingCentre.name}</p>}
            <button
              type="button"
              onClick={() => setTokenModalOpen(false)}
              className="min-h-[48px] w-full rounded-lg border-2 border-slate-300 font-bold text-slate-800"
            >
              {t("close", language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
