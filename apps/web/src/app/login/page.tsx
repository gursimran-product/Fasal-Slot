"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiJson } from "@/lib/api";
import { LANGUAGES, t } from "@/lib/i18n";

type Role = "farmer" | "agent" | "official";

interface PublicCentre {
  id: string;
  name: string;
  state: string | null;
}

const RESEND_SECONDS = 30;
const REMEMBER_TERMINAL_KEY = "fasalSlot.agentTerminal";

function LoginForm() {
  const { status, user, requestOtp, verifyOtp, loginWithPassword, loginAsAgent } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole: Role = searchParams.get("as") === "agent" || searchParams.get("as") === "official"
    ? (searchParams.get("as") as Role)
    : "farmer";

  const [language, setLanguage] = useState<Language>("en");
  const [role, setRole] = useState<Role>(initialRole);

  // Farmer OTP flow
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Agent license login
  const [centres, setCentres] = useState<PublicCentre[]>([]);
  const [mandiYardId, setMandiYardId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [rememberTerminal, setRememberTerminal] = useState(true);

  // Official password + 2FA flow
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialPassword, setOfficialPassword] = useState("");
  const [showOfficialPassword, setShowOfficialPassword] = useState(false);
  const [officialToken, setOfficialToken] = useState(["", "", "", "", "", ""]);
  const officialTokenRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.role === "farmer") router.replace("/home");
    else if (user.role === "agent") router.replace("/agent");
    else router.replace("/govt");
  }, [status, user, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  useEffect(() => {
    apiJson<{ centres: PublicCentre[] }>("/centres/public")
      .then((data) => setCentres(data.centres))
      .catch(() => {});

    try {
      const saved = localStorage.getItem(REMEMBER_TERMINAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { mandiYardId?: string; licenseNumber?: string; agentPhone?: string };
        if (parsed.mandiYardId) setMandiYardId(parsed.mandiYardId);
        if (parsed.licenseNumber) setLicenseNumber(parsed.licenseNumber);
        if (parsed.agentPhone) setAgentPhone(parsed.agentPhone);
      }
    } catch {
      // ignore malformed/inaccessible localStorage
    }
  }, []);

  function switchRole(next: Role) {
    setRole(next);
    setError(null);
  }

  async function sendOtp() {
    setError(null);
    if (!/^\d{10}$/.test(phone)) {
      setError(t("invalidPhone", language));
      return;
    }
    setSubmitting(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
      setOtp(["", "", "", ""]);
      setResendIn(RESEND_SECONDS);
      setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setError(t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    sendOtp();
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = otp.join("");
    setSubmitting(true);
    try {
      await verifyOtp(phone, code, language);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("invalidOtp", language) : t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  function handleOfficialTokenChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOfficialToken((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) officialTokenRefs.current[index + 1]?.focus();
  }

  function handleOfficialTokenKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !officialToken[index] && index > 0) officialTokenRefs.current[index - 1]?.focus();
  }

  async function handleOfficialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(officialEmail, officialPassword, officialToken.join(""));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("invalidOfficialLogin", language) : t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAgentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginAsAgent(licenseNumber, agentPhone, mpin);
      try {
        if (rememberTerminal) {
          localStorage.setItem(REMEMBER_TERMINAL_KEY, JSON.stringify({ mandiYardId, licenseNumber, agentPhone }));
        } else {
          localStorage.removeItem(REMEMBER_TERMINAL_KEY);
        }
      } catch {
        // ignore inaccessible localStorage
      }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("invalidAgentLogin", language) : t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  const activeTabClasses = "bg-emerald-800 text-white shadow-sm";
  const inactiveTabClasses = "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60";
  const tabClass = (r: Role) =>
    `flex flex-col items-center py-2 px-1 rounded-lg font-bold text-xs transition-all text-center ${
      role === r ? activeTabClasses : inactiveTabClasses
    }`;

  function TabLabel({ stringKey }: { stringKey: "roleFarmerVernacular" | "roleAgentVernacular" | "roleOfficialVernacular" }) {
    return (
      <>
        <span>{t(stringKey, language)}</span>
        {language !== "en" && <span className="text-[10px] font-medium opacity-75">{t(stringKey, "en")}</span>}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
      {/* CIVIC HEADER */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            <div className="flex items-center gap-3.5">
              <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={40} height={40} className="h-10 w-auto object-contain shrink-0" />
              <div className="hidden sm:block h-9 w-[1px] bg-slate-200" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-emerald-900 font-sans leading-none">FASAL SLOT</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">e-Procure</span>
                </div>
                <span className="text-xs text-slate-600 font-medium leading-tight mt-0.5">MSP Crop Procurement Grid</span>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-5">
              <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-lg shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 leading-none">Season Active</span>
                  <span className="text-xs font-bold text-slate-800 font-mono leading-tight">RMS 2026-27 (Wheat)</span>
                </div>
              </div>

              <a
                href="tel:18001802060"
                className="hidden lg:flex items-center gap-2.5 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">
                    24x7 Kisan Helpline
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono tracking-tight">1800-180-2060</span>
                </div>
              </a>

              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs font-semibold text-slate-600">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      language === lang.code
                        ? "bg-white text-emerald-900 font-bold shadow-xs border border-slate-200/60"
                        : "hover:text-slate-900"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN 2-COLUMN CONTENT */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: hero + value props (role-specific) */}
          <div className="lg:col-span-7 space-y-6">
            {role === "agent" ? (
              <>
                <div className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-emerald-800/40 text-white shadow-2xl">
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
                  </div>
                  <div className="relative z-10 p-7 sm:p-8">
                    <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-950/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[15px] text-amber-400">verified</span>
                      APMC Commission Agent Portal
                    </div>
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                      Arhtiya Portal — Batch Booking &amp; Mandi Clearance
                    </h1>
                    <p className="mt-2 text-sm font-medium text-emerald-200/90">
                      ਆੜ੍ਹਤੀਆ ਪੋਰਟਲ · ਬੈਚ ਸਲਾਟ ਬੁਕਿੰਗ ਅਤੇ ਜੇ-ਫਾਰਮ ਪ੍ਰਬੰਧਨ
                    </p>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-100/85 sm:text-base">
                      Centralized electronic management for licensed APMC Arhtiyas across Punjab &amp; Haryana. Book multi-farmer
                      consignments, streamline gate entry passes, and receive statutory 2.5% commission directly via PFMS.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[22px]">group_add</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1.5">Batch Roster Booking</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Aggregate up to 25 verified farmer consignments into single gate allocation windows.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                      <span>Fast Gate-In</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1.5">2.5% Direct PFMS Payout</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Statutory APMC commission credited directly to bank account on J-Form generation.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                      <span>Direct Credit</span>
                      <span className="material-symbols-outlined text-[13px]">done_all</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[22px]">speed</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1.5">Live Yard Sync</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Real-time weighbridge gross/tare and digital moisture clearance notifications.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                      <span>Real-time</span>
                      <span className="material-symbols-outlined text-[13px]">sync</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-bold text-sm text-slate-900 tracking-tight">Live Mandi Network Telemetry (Today)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="font-mono text-xl font-bold text-[#14532d]">14,820</div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">Licensed Arhtiyas Active</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="font-mono text-xl font-bold text-amber-700">15,842</div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">J-Forms Issued Today</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="font-mono text-xl font-bold text-emerald-700">98.4%</div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">Weighbridge Clearance</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="font-mono text-xl font-bold text-blue-700">152 Mandis</div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">Network Operational</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0 mt-0.5">contact_support</span>
                  <p className="text-xs leading-relaxed text-amber-950">
                    <strong className="font-bold text-amber-900">Need assistance with bulk roster upload or license renewal?</strong>{" "}
                    Contact APMC Mandi Nodal Desk at{" "}
                    <span className="font-mono font-semibold text-amber-900">1800-180-2060 (Ext 4)</span> or visit the Mandi Market
                    Committee Office.
                  </p>
                </div>
              </>
            ) : role === "official" ? (
              <>
                <div className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-emerald-800/40 text-white shadow-2xl">
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
                  </div>
                  <div className="relative z-10 flex flex-col gap-3.5 p-7 sm:p-8">
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Official Access Restricted
                    </div>
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                      Mandi Yard Oversight &amp; Physical Weighbridge Terminal
                    </h1>
                    <div className="text-xs font-medium text-emerald-200/90 sm:text-sm">
                      ਮੰਡੀ ਅਧਿਕਾਰੀ ਅਤੇ ਤੋਲ ਪੋਰਟਲ · खाद्य एवं नागरिक आपूर्ति
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/85 sm:text-base">
                      Central electronic authorization channel for District Food Controllers (DFSC), FCI Area Managers, Quality
                      Inspectors, and Mandi Yard Weighment Operators managing live physical intake and tare adjustment.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">traffic</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">In-Gate Throttle Control</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Dynamically regulate token slot allocation to prevent yard congestion and unlifted gunny sack pileup.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">biotech</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Digital QC &amp; Moisture Logs</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Direct calibrated NIR moisture tester integration with encrypted digital signatures for immediate grain
                      clearance.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Cross-Agency Ledger</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Centralized reconciliations across FCI, PUNSUP, HAFED, and MARKFED godown dispatch lines.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-800 text-[20px]">analytics</span>
                      <span className="font-bold text-sm text-slate-900">State Oversight Telemetry (Region 04-North)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Active Centres</span>
                      <span className="font-extrabold text-2xl text-slate-900 block mt-0.5">412</span>
                      <span className="text-[11px] text-emerald-700 font-medium">Operational Today</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Lifting Velocity</span>
                      <span className="font-extrabold text-2xl text-slate-900 block mt-0.5">88.2%</span>
                      <span className="text-[11px] text-emerald-700 font-medium">Daily Target Pace</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Congestion Index</span>
                      <span className="font-extrabold text-xl text-amber-700 block mt-0.5 flex items-center gap-1">
                        NORMAL
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                      </span>
                      <span className="text-[11px] text-slate-500">3 Mandis on Watch</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Procured Today</span>
                      <span className="font-extrabold text-xl text-emerald-900 block mt-0.5">94,310 MT</span>
                      <span className="text-[11px] text-slate-500">Across 18 Districts</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs">
                  <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0 mt-0.5">gavel</span>
                  <p className="leading-relaxed">
                    <strong className="font-bold">Restricted Access Notice:</strong> Authorized under Public Distribution System
                    (Control) Order and APMC State Directives. All terminal transactions, tare adjustments, and gate admissions are
                    cryptographically logged with IP and hardware hash tracking.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl border border-emerald-800/40 text-white shadow-2xl">
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
                  </div>
                  <div className="relative z-10 space-y-4 p-7 sm:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[15px] text-amber-400">verified</span>
                      APMC State Electronic Gate Allocation
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                        Fasal Slot — MSP Crop Procurement Portal
                      </h1>
                      <p className="mt-1 text-base font-medium text-emerald-200/90 sm:text-lg">
                        ਫ਼ਸਲ ਸਲਾਟ ਖਰੀਦ ਪੋਰਟਲ · ई-उपार्जन पारदर्शी गेट पास
                      </p>
                    </div>
                    <p className="text-sm font-normal leading-relaxed text-emerald-100/85 sm:text-base">
                      Transparent, guaranteed slot allocation and real-time mandi queue tracking for farmers of Punjab &amp; Haryana.
                      Arrive directly at your verified weighbridge window without queue congestions.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">timer_off</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">0-Hour Mandi Wait</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-normal">
                        No multi-day tractor lines. Strict 2-hour reserved gate allocation window.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">currency_rupee</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Guaranteed MSP Floor</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-normal">
                        Assured DBT bank credit straight to your Aadhaar-linked account within 48–72 hrs.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">water_drop</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Real-Time NIR Moisture</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-normal">
                        Calibrated digital telemetry moisture verification with instant on-slip logs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">sms</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Feature Phone &amp; Offline Booking Available
                    </span>
                    <p className="text-xs sm:text-sm text-amber-950 mt-0.5 leading-relaxed">
                      Don&apos;t have a smartphone? Visit your authorized Arhtiya Mandi office for instant paper token printing and
                      assisted booking.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-t border-slate-200 text-slate-600 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified_user</span>
                <span className="font-semibold text-slate-800">NIC Certified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">hub</span>
                <span className="font-semibold text-slate-800">AgriStack Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">account_balance</span>
                <span className="font-semibold text-slate-800">DBT PFMS Integrated</span>
              </div>
            </div>
          </div>

          {/* RIGHT: sign-in card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 relative">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t("signIn", language)}</h2>
                  <span className="material-symbols-outlined text-emerald-700 text-[24px]">lock</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{t("selectRolePrompt", language)}</p>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/80" role="tablist">
                <button type="button" role="tab" aria-selected={role === "farmer"} className={tabClass("farmer")} onClick={() => switchRole("farmer")}>
                  <span className="material-symbols-outlined text-[18px] mb-0.5">agriculture</span>
                  <TabLabel stringKey="roleFarmerVernacular" />
                </button>
                <button type="button" role="tab" aria-selected={role === "agent"} className={tabClass("agent")} onClick={() => switchRole("agent")}>
                  <span className="material-symbols-outlined text-[18px] mb-0.5">storefront</span>
                  <TabLabel stringKey="roleAgentVernacular" />
                </button>
                <button type="button" role="tab" aria-selected={role === "official"} className={tabClass("official")} onClick={() => switchRole("official")}>
                  <span className="material-symbols-outlined text-[18px] mb-0.5">shield_person</span>
                  <TabLabel stringKey="roleOfficialVernacular" />
                </button>
              </div>

              {role === "farmer" && !otpSent && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800" htmlFor="farmerPhone">
                      Mobile Number registered with Meri Fasal Mera Byora / e-Kharid
                    </label>
                    <div className="relative flex items-center rounded-xl border border-slate-300 overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 bg-white">
                      <div className="flex items-center gap-1 px-3 py-3 bg-slate-50 border-r border-slate-300 text-slate-700 font-mono font-bold text-sm select-none">
                        <span>+91</span>
                      </div>
                      <input
                        id="farmerPhone"
                        type="tel"
                        inputMode="numeric"
                        autoFocus
                        maxLength={10}
                        placeholder={t("phonePlaceholder", language)}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full px-3.5 py-3 font-mono text-base font-bold text-slate-900 focus:outline-none bg-transparent placeholder-slate-400 tracking-wider"
                      />
                    </div>
                  </div>

                  {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base sm:text-lg rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px]">sms</span>
                    <span>{t("sendOtp", language)}</span>
                  </button>
                </form>
              )}

              {role === "farmer" && otpSent && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setError(null);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                  >
                    ← {t("back", language)}
                  </button>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">{t("enterOtp", language)} {phone}</label>
                    <div className="grid grid-cols-4 gap-3">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-full h-14 text-center text-xl font-bold font-mono border-2 border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <span>{t("didntReceiveCode", language)}</span>
                      <button
                        type="button"
                        disabled={resendIn > 0 || submitting}
                        onClick={() => sendOtp()}
                        className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline disabled:text-slate-400 disabled:no-underline"
                      >
                        {t("resendOtp", language)} {resendIn > 0 ? `(00:${resendIn.toString().padStart(2, "0")})` : ""}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting || otp.some((d) => !d)}
                    className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base sm:text-lg rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    <span>{t("verifyAndEnterPortal", language)}</span>
                  </button>
                </form>
              )}

              {role === "agent" && (
                <form onSubmit={handleAgentLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800" htmlFor="mandiYard">
                      {t("mandiYardLabel", language)}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[19px] pointer-events-none">
                        location_on
                      </span>
                      <select
                        id="mandiYard"
                        value={mandiYardId}
                        onChange={(e) => setMandiYardId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl pl-10 pr-9 py-3 font-medium focus:bg-white focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">{t("selectMandiYard", language)}</option>
                        {centres.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.state ? `${c.state} — ${c.name}` : c.name}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 text-[20px] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800" htmlFor="licenseNumber">
                      {t("licenseNumberLabel", language)}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[19px] pointer-events-none">
                        apartment
                      </span>
                      <input
                        id="licenseNumber"
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. PB-KHA-8841"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm rounded-xl pl-10 pr-4 py-3 font-semibold uppercase focus:bg-white focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-all tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800" htmlFor="agentPhone">
                      {t("agentPhoneLabel", language)}
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:border-[#166534] focus-within:ring-1 focus-within:ring-[#166534] transition-all">
                      <span className="px-3.5 py-3 bg-slate-100 border-r border-slate-200 text-slate-700 font-mono text-sm font-bold flex items-center">
                        +91
                      </span>
                      <input
                        id="agentPhone"
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        placeholder={t("phonePlaceholder", language)}
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full bg-transparent border-0 px-3.5 py-3 text-slate-900 font-mono text-sm font-medium focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800" htmlFor="mpin">
                        {t("mpinLabel", language)}
                      </label>
                      <span className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold cursor-default">
                        {t("forgotPin", language)}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[19px] pointer-events-none">
                        key
                      </span>
                      <input
                        id="mpin"
                        type={showMpin ? "text" : "password"}
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={mpin}
                        onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base rounded-xl pl-10 pr-11 py-2.5 font-bold tracking-[0.35em] focus:bg-white focus:border-[#166534] focus:ring-1 focus:ring-[#166534] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpin((s) => !s)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">{showMpin ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberTerminal}
                      onChange={(e) => setRememberTerminal(e.target.checked)}
                      className="w-4 h-4 rounded text-[#166534] focus:ring-[#166534] border-slate-300"
                    />
                    <span className="text-xs text-slate-600 font-medium">{t("rememberTerminal", language)}</span>
                  </label>

                  {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 bg-[#166534] hover:bg-green-800 active:bg-green-900 text-white font-bold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span>{t("enterAgentTerminal", language)}</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>

                  <p className="text-center text-xs text-emerald-800 font-semibold">{t("newAgentNote", language)}</p>
                </form>
              )}

              {role === "official" && (
                <form onSubmit={handleOfficialLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800" htmlFor="officialEmail">
                      {t("officialEmailLabel", language)}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[19px] pointer-events-none">
                        mail
                      </span>
                      <input
                        id="officialEmail"
                        type="email"
                        required
                        autoFocus
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 font-mono text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800" htmlFor="officialPassword">
                        {t("passwordLabel", language)}
                      </label>
                      <span className="text-[11px] text-emerald-800 font-semibold cursor-default">{t("forgotPasswordNic", language)}</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[19px] pointer-events-none">
                        lock
                      </span>
                      <input
                        id="officialPassword"
                        type={showOfficialPassword ? "text" : "password"}
                        required
                        value={officialPassword}
                        onChange={(e) => setOfficialPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 font-mono text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOfficialPassword((s) => !s)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">{showOfficialPassword ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-800 text-[18px]">pin</span>
                      <span className="text-xs font-bold text-slate-800">{t("hardwareTokenLabel", language)}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {officialToken.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            officialTokenRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOfficialTokenChange(i, e.target.value)}
                          onKeyDown={(e) => handleOfficialTokenKeyDown(i, e)}
                          className="w-full h-11 text-center font-mono font-bold text-base bg-emerald-50/50 border border-emerald-300 text-emerald-900 rounded-lg focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500">{t("hardwareTokenHint", language)}</span>
                  </div>

                  {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting || officialToken.some((d) => !d)}
                    className="w-full h-14 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    <span>{t("launchGateConsole", language)}</span>
                  </button>
                </form>
              )}

              {role === "farmer" && (
                <div className="text-center pt-4 mt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-emerald-800">{t("newFarmerNote", language)}</span>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-center">
                <span className="material-symbols-outlined text-slate-400 text-[16px]">verified</span>
                <p className="text-[11px] text-slate-500 font-medium">{t("securedByUidai", language)}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <span className="material-symbols-outlined text-emerald-700 text-[18px]">account_balance</span>
            <span>Department of Agriculture &amp; Farmers Welfare · State APMC Procurement Grid</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>TLS 1.3 ENCRYPTED</span>
            <span>•</span>
            <span>AADHAAR AUTH V2.1</span>
          </div>
          <div>© 2026 Fasal Slot E-Procurement Engine. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
