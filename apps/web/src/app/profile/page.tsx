"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Booking, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { LANGUAGES, t } from "@/lib/i18n";
import { mspRate } from "@/lib/msp";

const SEASON_QUOTA_QTL = 240;

interface AgentPublicInfo {
  id: string;
  name: string;
  phone: string | null;
}

export default function ProfilePage() {
  const { user, logout, authFetch } = useAuth();
  const { farmer, setFarmer } = useFarmerProfile();
  const router = useRouter();
  const language: Language = farmer?.language ?? "en";

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [agent, setAgent] = useState<AgentPublicInfo | null>(null);
  const [languageSaving, setLanguageSaving] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", village: "", district: "", state: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  function startEditingProfile() {
    setProfileForm({
      name: farmer?.name ?? user?.name ?? "",
      village: farmer?.village ?? "",
      district: farmer?.district ?? "",
      state: farmer?.state ?? "",
    });
    setProfileError(null);
    setEditingProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const res = await authFetch(`/farmers/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setProfileError(body.error ?? t("profileUpdateFailed", language));
        return;
      }
      const { farmer: updated } = await res.json();
      setFarmer(updated);
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  // Real numbers, derived from the farmer's actual bookings.
  const totalBookedQtl = useMemo(() => {
    if (!bookings) return 0;
    return bookings
      .filter((b) => b.stage !== "cancelled" && b.stage !== "rejected")
      .reduce((sum, b) => sum + (b.quantityQtl ?? 0), 0);
  }, [bookings]);

  const totalDisbursed = useMemo(() => {
    if (!bookings) return 0;
    return bookings.filter((b) => b.stage === "paid").reduce((sum, b) => sum + (b.amountPaid ?? 0), 0);
  }, [bookings]);

  const recentVehicleBooking = useMemo(() => {
    if (!bookings) return null;
    return bookings.find((b) => b.vehicleNumber) ?? null;
  }, [bookings]);

  const remainingQtl = Math.max(0, SEASON_QUOTA_QTL - totalBookedQtl);
  const progressPct = Math.min(100, Math.round((totalBookedQtl / SEASON_QUOTA_QTL) * 100));
  const primaryCrop = bookings?.[0]?.crop ?? "wheat";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <a href="/home" className="flex items-center gap-1 hover:text-emerald-800">
              <span className="material-symbols-outlined text-[16px]">home</span>
              {t("dashboardNav", language)}
            </a>
            <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">{t("profileTitle", language)}</span>
          </div>
          <a
            href="/home"
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t("backToDashboard", language)}
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: identity + arhtiya */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-emerald-900 text-2xl font-extrabold text-white">
                    {(farmer?.name ?? user?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-extrabold text-slate-900">{farmer?.name ?? user?.name}</span>
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      {t("verifiedGrower", language)}
                    </span>
                  </div>
                </div>
                {!editingProfile && (
                  <button
                    type="button"
                    onClick={startEditingProfile}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    {t("editProfile", language)}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("mobileNumber", language)}</span>
                  <span className="mp-mask font-mono font-bold text-slate-900">{farmer?.phone ?? user?.phone ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("aadhaarStatus", language)}</span>
                  {farmer?.aadhaarRef ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-800">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      •••• {farmer.aadhaarRef.slice(-4)} ({t("aadhaarVerified", language)})
                    </span>
                  ) : (
                    <span className="font-bold text-slate-400">{t("aadhaarNotLinked", language)}</span>
                  )}
                </div>
              </div>

              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">{t("nameLabel", language)}</label>
                    <input
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">{t("villageLabel", language)}</label>
                    <input
                      value={profileForm.village}
                      onChange={(e) => setProfileForm((f) => ({ ...f, village: e.target.value }))}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-800">{t("districtLabel", language)}</label>
                      <input
                        value={profileForm.district}
                        onChange={(e) => setProfileForm((f) => ({ ...f, district: e.target.value }))}
                        className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-800">{t("stateLabel", language)}</label>
                      <input
                        value={profileForm.state}
                        onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))}
                        className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  {profileError && <p className="text-xs font-semibold text-red-700">{profileError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="h-10 flex-1 rounded-lg bg-emerald-900 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {t("saveChanges", language)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      {t("cancelEdit", language)}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">{t("registeredAddress", language)}</span>
                  <p className="text-sm text-slate-600">
                    {[farmer?.village, farmer?.district, farmer?.state].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-emerald-800">storefront</span>
                <h2 className="text-base font-bold text-slate-900">{t("assignedArhtiya", language)}</h2>
              </div>
              {agent ? (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="font-bold text-slate-900">{agent.name}</span>
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-800 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">—</p>
              )}
            </section>
          </div>

          {/* RIGHT: ledger + vehicle + support */}
          <div className="flex flex-col gap-5 lg:col-span-8">
            <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-emerald-800">query_stats</span>
                  <h2 className="text-base font-bold text-slate-900">{t("procurementLedger", language)}</h2>
                </div>
                <a
                  href="/book"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  {t("bookASlot", language)}
                </a>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {t("totalBookedSeason", language)} ({progressPct}%)
                  </span>
                  <span className="font-mono font-bold text-emerald-900">
                    {totalBookedQtl} / {SEASON_QUOTA_QTL} Qtl
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-emerald-800" style={{ width: `${progressPct}%` }} />
                </div>
                {/* Illustrative — no real per-farmer season ceiling is tracked yet */}
                <span className="text-xs text-slate-500">
                  {t("seasonQuota", language)}: {SEASON_QUOTA_QTL} Qtl ({t("illustrativeSuffix", language)})
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    <span className="material-symbols-outlined text-[22px]">task_alt</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">{t("totalDisbursed", language)}</span>
                    <span className="font-mono text-lg font-bold text-emerald-900">₹{totalDisbursed.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800">
                    <span className="material-symbols-outlined text-[22px]">pending</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">{t("projectedValueRemaining", language)}</span>
                    <span className="font-mono text-lg font-bold text-amber-700">
                      ₹{(remainingQtl * mspRate(primaryCrop)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-emerald-800">local_shipping</span>
                <h2 className="text-base font-bold text-slate-900">{t("recentVehicle", language)}</h2>
              </div>
              {recentVehicleBooking ? (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5 text-sm">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-slate-900">{recentVehicleBooking.vehicleNumber}</span>
                    {recentVehicleBooking.driverName && (
                      <span className="text-xs text-slate-500">
                        {t("driverLabel", language)}: {recentVehicleBooking.driverName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {t("usedForPrefix", language)} #{recentVehicleBooking.refCode}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t("noRecentVehicle", language)}</p>
              )}
            </section>

            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-5">
              <div className="flex items-center gap-3.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-900 text-white">
                  <span className="material-symbols-outlined text-[22px]">support_agent</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t("supportGrievance", language)}</h3>
                  <p className="text-xs text-slate-600">{t("kisanHelpline24x7", language)}: 1800-180-2060</p>
                </div>
              </div>
              <a
                href="tel:18001802060"
                className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                {t("callButton", language)}
              </a>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
