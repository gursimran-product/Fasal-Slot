"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { LANGUAGES, t } from "@/lib/i18n";

type Role = "farmer" | "agent" | "official";

const ROLE_TABS: { key: Role; labelPa: string; labelEn: string; icon: string }[] = [
  { key: "farmer", labelPa: "ਕਿਸਾਨ", labelEn: "Farmer", icon: "agriculture" },
  { key: "agent", labelPa: "ਆੜ੍ਹਤੀਆ", labelEn: "Agent", icon: "storefront" },
  { key: "official", labelPa: "ਅਧਿਕਾਰੀ", labelEn: "Official", icon: "shield_person" },
];

const PILLARS = [
  {
    icon: "timer_off",
    accent: "emerald",
    title: "0-Hour Mandi Wait",
    body: "No multi-day tractor lines. A strict reserved gate allocation window takes you directly to the weighbridge.",
    tag: "ਖੱਜਲ-ਖ਼ੁਆਰੀ ਮੁਕਤ",
  },
  {
    icon: "currency_rupee",
    accent: "amber",
    title: "Guaranteed MSP Floor",
    body: "Assured MSP rate settled directly to your linked bank account, tracked from booking through payment.",
    tag: "ਸਿੱਧਾ ਖਾਤੇ ਵਿੱਚ ਭੁਗਤਾਨ",
  },
  {
    icon: "water_drop",
    accent: "blue",
    title: "Transparent Moisture Check",
    body: "Moisture declared up front and recorded at weighing, so there are no surprises at the gate.",
    tag: "ਨਮੀ ਦੀ ਸਹੀ ਜਾਂਚ",
  },
];

function dashboardPathFor(role: string): string {
  if (role === "farmer") return "/home";
  if (role === "agent") return "/agent";
  return "/govt";
}

export default function LandingPage() {
  const { status, user } = useAuth();
  const [role, setRole] = useState<Role>("farmer");
  const [language, setLanguage] = useState<Language>("en");
  const isAuthenticated = status === "authenticated" && !!user;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 antialiased">
      {/* Tricolor civic accent ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-700" />

      {/* Header */}
      <header className="sticky top-1.5 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-amber-50 to-emerald-50 p-1.5 shadow-sm">
              <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={40} height={40} className="h-10 w-10 object-contain" />
            </div>
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold leading-none tracking-tight text-emerald-950">FASAL SLOT</span>
                <span className="rounded-md border border-emerald-300/60 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  e-Procure
                </span>
              </div>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-medium leading-tight text-slate-600">
                <span>ਖੁਰਾਕ ਅਤੇ ਜਨਤਕ ਵੰਡ ਵਿਭਾਗ</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">Dept. of Food &amp; Public Distribution</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <div className="hidden items-center gap-2.5 rounded-full border border-emerald-300/80 bg-emerald-50/90 px-3.5 py-1.5 shadow-sm md:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
              </span>
              <div className="flex items-center gap-2 text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">RMS 2026-27</span>
                <span className="font-mono text-xs font-bold text-slate-900">Wheat / ਕਣਕ Active</span>
              </div>
            </div>

            <a
              href="tel:18001802060"
              className="group hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md lg:flex"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white transition-colors group-hover:bg-emerald-700">
                <span className="material-symbols-outlined text-[18px]">call</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-slate-500">24x7 Kisan Helpline</span>
                <span className="font-mono text-xs font-bold tracking-tight text-emerald-950 group-hover:text-emerald-700">1800-180-2060</span>
              </div>
            </a>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
                    language === lang.code
                      ? "border border-slate-200 bg-white font-extrabold text-emerald-900 shadow-sm"
                      : "hover:text-slate-900"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* LEFT: hero + pillars + telemetry */}
          <div className="space-y-6 lg:col-span-7">
            {/* Cinematic hero banner */}
            <div className="group relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-3xl border border-emerald-800/40 text-white shadow-2xl">
              <div className="absolute inset-0 z-0">
                <Image
                  src="/farmer-field.jpg"
                  alt="Punjab wheat harvest landscape"
                  fill
                  priority
                  className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#00251c] via-[#003629]/90 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001a14] via-[#00251c]/70 to-transparent" />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(circle at 30% 20%, rgba(245,158,11,0.22) 0%, rgba(0,54,41,0) 65%)" }}
                />
              </div>

              <div className="relative z-10 p-6 pb-0 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-200 shadow-lg backdrop-blur-md">
                    <span className="material-symbols-outlined text-[16px] text-amber-400">verified</span>
                    APMC Electronic Gate &amp; Weighbridge Allocation
                  </div>
                  <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/70 px-3 py-1 font-mono text-xs font-semibold text-amber-300 backdrop-blur-md sm:inline-flex">
                    <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                    <span>Direct MSP Rate Guaranteed</span>
                  </div>
                </div>

                <div className="mt-5 max-w-xl">
                  <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
                    Fasal Slot <span className="font-serif italic text-amber-400">—</span> MSP Crop Procurement
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-base font-semibold text-emerald-200/90 sm:text-lg">
                    <span>ਫ਼ਸਲ ਸਲਾਟ ਖਰੀਦ ਪੋਰਟਲ</span>
                    <span className="text-emerald-500">•</span>
                    <span className="font-normal text-amber-200">पारदर्शी गेट पास</span>
                  </p>
                  <p className="mt-3 max-w-lg text-xs font-normal leading-relaxed text-emerald-100/85 sm:text-sm">
                    Real-time slot booking, live queue visibility, and verified crop procurement for farmers, agents,
                    and government mandi centres — all on one shared platform.
                  </p>
                </div>
              </div>

              {/* Floating farmer testimonial card */}
              <div className="relative z-10 p-6 pt-4 sm:p-8">
                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:bg-white/15 sm:flex-row sm:p-4">
                  <div className="flex w-full items-center gap-3.5 sm:w-auto">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400 bg-emerald-800 text-lg font-bold text-white shadow-md sm:h-16 sm:w-16">
                        RK
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-emerald-950 bg-emerald-600 p-0.5 text-white">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Ramesh Kumar</span>
                        <span className="rounded border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                          #F3504
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-emerald-100/80">
                        &quot;Booked my slot, arrived at my window, weighed and paid — no waiting around.&quot;
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-between gap-1 border-t border-white/10 pt-2 sm:w-auto sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      Real-time slot tracking
                    </span>
                    <span className="text-[10px] font-medium text-emerald-200/70">Verified booking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 pillars */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className={`group cursor-default rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    p.accent === "emerald"
                      ? "hover:border-emerald-400/80"
                      : p.accent === "amber"
                      ? "hover:border-amber-400/80"
                      : "hover:border-blue-400/80"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl border transition-all group-hover:scale-110 group-hover:text-white ${
                      p.accent === "emerald"
                        ? "border-emerald-200/60 bg-emerald-50 text-emerald-800 group-hover:bg-emerald-700"
                        : p.accent === "amber"
                        ? "border-amber-200/60 bg-amber-50 text-amber-800 group-hover:bg-amber-600"
                        : "border-blue-200/60 bg-blue-50 text-blue-800 group-hover:bg-blue-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{p.icon}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{p.body}</p>
                  <div
                    className={`mt-3 flex items-center border-t border-slate-100 pt-2.5 text-[11px] font-bold ${
                      p.accent === "emerald" ? "text-emerald-700" : p.accent === "amber" ? "text-amber-700" : "text-blue-700"
                    }`}
                  >
                    <span>{p.tag}</span>
                    <span className="material-symbols-outlined ml-1 text-[14px]">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live telemetry strip (illustrative) */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  </span>
                  <h2 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-900">
                    <span>Today&apos;s Mandi Procurement Snapshot</span>
                    <span className="text-xs font-normal text-slate-400">| ਲਾਈਵ ਮੰਡੀ ਅੰਕੜੇ</span>
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-emerald-50/40">
                  <span className="block text-xs font-medium text-slate-500">Mandis Connected</span>
                  <span className="mt-1 block font-mono text-2xl font-black tracking-tight text-slate-900">3</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">Haryana Operational</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-emerald-50/40">
                  <span className="block text-xs font-medium text-slate-500">Time Windows / Day</span>
                  <span className="mt-1 block font-mono text-2xl font-black tracking-tight text-emerald-800">3</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">Per centre</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-amber-50/40">
                  <span className="block text-xs font-medium text-slate-500">Crops Supported</span>
                  <span className="mt-1 block font-mono text-2xl font-black tracking-tight text-amber-700">2</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-600">Wheat &amp; Paddy</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-emerald-50/40">
                  <span className="block text-xs font-medium text-slate-500">Booking Stages</span>
                  <span className="mt-1 block font-mono text-2xl font-black tracking-tight text-emerald-900">5</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">Booked to Paid</span>
                </div>
              </div>
            </div>

            {/* Civic trust badges */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-2 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 transition-colors hover:text-emerald-800">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">timeline</span>
                <span className="font-bold text-slate-800">Live Status</span>
                <span className="text-slate-400">· Booked through Paid</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-emerald-800">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">translate</span>
                <span className="font-bold text-slate-800">Multi-language</span>
                <span className="text-slate-400">· English, Hindi, Punjabi</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-emerald-800">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">account_balance</span>
                <span className="font-bold text-slate-800">Government &amp; Agent Ready</span>
              </div>
            </div>
          </div>

          {/* RIGHT: sign-in gateway */}
          <div className="lg:sticky lg:top-24 lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl transition-all duration-300 hover:shadow-2xl sm:p-8">
              <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-emerald-100/40 via-transparent to-transparent" />

              <div className="relative z-10 mb-6">
                <div className="mb-1.5 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {isAuthenticated ? t("welcomeBack", language) : t("signIn", language)}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {isAuthenticated ? `${t("signedInAs", language)} ${user!.name}` : t("selectRolePrompt", language)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-800">
                    <span className="material-symbols-outlined text-[22px]">{isAuthenticated ? "person" : "lock"}</span>
                  </div>
                </div>
              </div>

              {isAuthenticated && user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="material-symbols-outlined text-emerald-700">check_circle</span>
                    <p className="text-xs text-slate-600">{t("alreadySignedIn", language)}</p>
                  </div>
                  <Link
                    href={dashboardPathFor(user.role)}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-base font-bold text-white shadow-lg transition-all hover:from-emerald-900 hover:to-emerald-800 hover:shadow-xl active:scale-[0.99] sm:text-lg"
                  >
                    <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
                    <span>{t("goToDashboard", language)}</span>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5" role="tablist">
                    {ROLE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={role === tab.key}
                        onClick={() => setRole(tab.key)}
                        className={`flex flex-col items-center rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all duration-200 ${
                          role === tab.key ? "bg-emerald-800 text-white shadow-md" : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined mb-0.5 text-[19px]">{tab.icon}</span>
                        <span className="leading-tight">
                          {tab.key === "farmer"
                            ? t("roleFarmerVernacular", language)
                            : tab.key === "agent"
                            ? t("roleAgentVernacular", language)
                            : t("roleOfficialVernacular", language)}
                        </span>
                        {language !== "en" && <span className="text-[10px] font-medium leading-tight opacity-90">{tab.labelEn}</span>}
                      </button>
                    ))}
                  </div>

                  {role === "farmer" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="material-symbols-outlined text-emerald-700">call</span>
                    <p className="text-xs text-slate-600">{t("farmerSignInHint", language)}</p>
                  </div>
                  <Link
                    href="/login?as=farmer"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-base font-bold text-white shadow-lg transition-all hover:from-emerald-900 hover:to-emerald-800 hover:shadow-xl active:scale-[0.99] sm:text-lg"
                  >
                    <span className="material-symbols-outlined text-[22px]">login</span>
                    <span>{t("continueAsFarmer", language)}</span>
                  </Link>
                </div>
              )}

              {role === "agent" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="material-symbols-outlined text-emerald-700">badge</span>
                    <p className="text-xs text-slate-600">{t("agentSignInHint", language)}</p>
                  </div>
                  <Link
                    href="/login?as=agent"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-base font-bold text-white shadow-lg transition-all hover:from-emerald-900 hover:to-emerald-800 hover:shadow-xl active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[20px]">store</span>
                    <span>{t("continueAsAgent", language)}</span>
                  </Link>
                </div>
              )}

              {role === "official" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="material-symbols-outlined text-emerald-700">shield</span>
                    <p className="text-xs text-slate-600">{t("officialSignInHint", language)}</p>
                  </div>
                  <Link
                    href="/login?as=official"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-base font-bold text-white shadow-lg transition-all hover:from-emerald-900 hover:to-emerald-800 hover:shadow-xl active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[20px]">shield</span>
                    <span>{t("continueAsOfficial", language)}</span>
                  </Link>
                </div>
              )}
                </>
              )}

              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-center">
                <span className="material-symbols-outlined text-[16px] text-slate-400">verified</span>
                <p className="text-[11px] font-medium text-slate-500">{t("slotStatusAlwaysVisible", language)}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[18px] text-emerald-700">account_balance</span>
            <span>MSP Crop Procurement Grid</span>
          </div>
          <div>© 2026 Fasal Slot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
