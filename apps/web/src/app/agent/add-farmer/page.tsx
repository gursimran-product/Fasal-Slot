"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Centre, CentreCapacityWithAvailability, Language, PlrsRegistryRecord } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { CROPS, cropLabel } from "@/lib/crops";
import { mspRate } from "@/lib/msp";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "pa", label: "Punjabi" },
];

type Mode = "search" | "manual";
type BookingDecision = "immediate" | "roster";

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

export default function AddFarmerPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [agentCentreId, setAgentCentreId] = useState<string | null>(null);
  const [centre, setCentre] = useState<Centre | null>(null);

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [plrsRecord, setPlrsRecord] = useState<PlrsRegistryRecord | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [language, setLanguage] = useState<Language>("pa");

  const [otpSent, setOtpSent] = useState(false);
  const [displayedOtp, setDisplayedOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [consentToken, setConsentToken] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  const [decision, setDecision] = useState<BookingDecision>("immediate");
  const [crop, setCrop] = useState<string>(CROPS[0]);
  const [day, setDay] = useState(todayIso());
  const [timeWindows, setTimeWindows] = useState<CentreCapacityWithAvailability[]>([]);
  const [timeWindow, setTimeWindow] = useState("");
  const [quantityQtl, setQuantityQtl] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [moistureDeclared, setMoistureDeclared] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ farmerName: string; bookingRef: string | null } | null>(null);

  const days = useMemo(() => nextDays(14), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/agents/${user.id}`);
      if (res.ok) {
        const { agent } = await res.json();
        if (!cancelled) setAgentCentreId(agent.centreId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  useEffect(() => {
    if (!agentCentreId) return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres`);
      if (res.ok) {
        const { centres } = await res.json();
        if (!cancelled) setCentre(centres.find((c: Centre) => c.id === agentCentreId) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentCentreId, authFetch]);

  useEffect(() => {
    if (!agentCentreId || !day || decision !== "immediate") return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/centres/${agentCentreId}/capacity?date=${day}`);
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
  }, [agentCentreId, day, decision, authFetch]);

  const effectivePhone = plrsRecord?.mobile ?? phone;
  const totalQuota = plrsRecord?.landParcels.reduce((sum, p) => sum + p.estimatedYieldQtl, 0) ?? 0;
  const selectedFreeSlots = timeWindows.find((w) => w.timeWindow === timeWindow)?.availableSlots ?? 0;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setPlrsRecord(null);
    try {
      const res = await authFetch(`/plrs-registry/lookup?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        setSearchError(
          res.status === 404
            ? "No matching record in the simulated PLRS registry. You can switch to manual registration instead."
            : "Lookup failed"
        );
        return;
      }
      const { record } = (await res.json()) as { record: PlrsRegistryRecord };
      setPlrsRecord(record);
      setName(record.name);
      setPhone(record.mobile);
      setVillage(record.village ?? "");
      setDistrict(record.district ?? "");
      setState(record.state ?? "");
      // Reset any previously-verified consent since the phone may have changed.
      setOtpSent(false);
      setConsentToken(null);
    } finally {
      setSearching(false);
    }
  }

  function resetConsent() {
    setOtpSent(false);
    setOtpCode("");
    setDisplayedOtp(null);
    setConsentToken(null);
    setConsentError(null);
  }

  async function handleSendOtp() {
    if (effectivePhone.length !== 10) return;
    setSendingOtp(true);
    setConsentError(null);
    try {
      const res = await authFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone: effectivePhone }) });
      if (!res.ok) {
        setConsentError("Could not send OTP");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setDisplayedOtp(typeof body.otp === "string" ? body.otp : null);
      setOtpSent(true);
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setVerifyingOtp(true);
    setConsentError(null);
    try {
      const res = await authFetch("/farmers/consent/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: effectivePhone, otp: otpCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConsentError(body.error ?? "Invalid or expired OTP");
        return;
      }
      setConsentToken(body.consentToken);
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!consentToken) {
      setSubmitError("Farmer consent must be OTP-verified before you can continue.");
      return;
    }
    if (decision === "immediate") {
      const qty = Number(quantityQtl);
      if (!Number.isFinite(qty) || qty < 1) {
        setSubmitError("Enter a valid quantity to book a slot now.");
        return;
      }
      if (!moistureDeclared) {
        setSubmitError("Moisture declaration is required to book a slot now.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const farmerRes = await authFetch("/farmers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: effectivePhone,
          village,
          district,
          state,
          language,
          consentToken,
          plrs: plrsRecord
            ? {
                mfmbId: plrsRecord.mfmbId,
                guardianName: plrsRecord.guardianName ?? undefined,
                aadhaarRef: plrsRecord.aadhaarLast4,
                holdingCategory: plrsRecord.holdingCategory ?? undefined,
                landAcres: plrsRecord.landAcres ?? undefined,
                bankName: plrsRecord.bankName ?? undefined,
                bankAccountLast4: plrsRecord.bankAccountLast4 ?? undefined,
                bankIfsc: plrsRecord.bankIfsc ?? undefined,
                landParcels: plrsRecord.landParcels,
              }
            : undefined,
        }),
      });
      const farmerBody = await farmerRes.json().catch(() => ({}));
      if (!farmerRes.ok) {
        setSubmitError(farmerBody.error ?? "Could not register farmer");
        return;
      }
      const farmer = farmerBody.farmer;

      let bookingRef: string | null = null;
      if (decision === "immediate" && agentCentreId) {
        const bookingRes = await authFetch("/bookings", {
          method: "POST",
          body: JSON.stringify({
            farmerId: farmer.id,
            centreId: agentCentreId,
            crop,
            date: day,
            timeWindow,
            quantityQtl: Number(quantityQtl),
            vehicleNumber: vehicleNumber || null,
            driverName: driverName || null,
            moistureDeclared: true,
          }),
        });
        const bookingBody = await bookingRes.json().catch(() => ({}));
        if (!bookingRes.ok) {
          setSubmitError(`Farmer registered, but slot booking failed: ${bookingBody.error ?? "unknown error"}`);
          setSuccess({ farmerName: farmer.name, bookingRef: null });
          return;
        }
        bookingRef = bookingBody.booking.refCode;
      }

      setSuccess({ farmerName: farmer.name, bookingRef });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <span className="material-symbols-outlined text-[48px] text-emerald-700">check_circle</span>
        <h1 className="text-xl font-bold text-slate-900">{success.farmerName} added</h1>
        {success.bookingRef ? (
          <p className="text-sm text-slate-600">
            Slot booked — reference <span className="font-mono font-bold text-emerald-800">#{success.bookingRef}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-600">Added to your farmer roster. Book their slot any time from the dashboard.</p>
        )}
        <button
          type="button"
          onClick={() => router.push("/agent")}
          className="mt-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">RMS 2026-27</span>
              <span className="text-xs font-medium text-slate-500">Register &amp; Link New Farmer</span>
            </div>
            <h1 className="text-lg font-extrabold text-emerald-900">Add Farmer{centre ? ` · ${centre.name}` : ""}</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/agent")}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to dashboard
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
        {/* LEFT: search / profile / consent */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          {/* Mode switcher */}
          <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`rounded-md px-4 py-2 text-xs font-bold ${mode === "search" ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600"}`}
            >
              Search by Mobile / MFMB ID
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setPlrsRecord(null);
                resetConsent();
              }}
              className={`rounded-md px-4 py-2 text-xs font-bold ${mode === "manual" ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600"}`}
            >
              Manual Registration
            </button>
          </div>

          {mode === "search" && (
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Mobile Number / MFMB ID / Aadhaar Last 4</label>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-800">
                  Simulated PLRS Registry (Demo Data)
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 9814066231 or MFMB-PB-2026-904122"
                  className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="h-11 rounded-lg bg-emerald-900 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {searching ? "Searching…" : "Verify"}
                </button>
              </div>
              {searchError && <p className="text-xs font-medium text-red-700">{searchError}</p>}
              {plrsRecord && (
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
                  <span className="material-symbols-outlined text-emerald-700">verified_user</span>
                  <p className="text-xs font-medium text-emerald-900">
                    Record found in the simulated registry — this is seeded demo data, not a live government lookup.
                  </p>
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                Try demo numbers: 9814066231, 9876543210, or 9988776655.
              </p>
            </section>
          )}

          {plrsRecord && mode === "search" && (
            <>
              <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Verified Farmer Identity</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Farmer Name / Guardian</span>
                    <p className="text-sm font-bold text-slate-900">{plrsRecord.name}</p>
                    {plrsRecord.guardianName && <p className="text-xs text-slate-500">S/o {plrsRecord.guardianName}</p>}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Mobile / MFMB UID</span>
                    <p className="font-mono text-sm font-bold text-slate-900">+91 {plrsRecord.mobile}</p>
                    <p className="text-xs text-slate-500">{plrsRecord.mfmbId}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Village / Tehsil / District</span>
                    <p className="text-sm font-bold text-slate-900">{plrsRecord.village}</p>
                    <p className="text-xs text-slate-500">
                      {plrsRecord.tehsil} · {plrsRecord.district} ({plrsRecord.pincode})
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Holding Category</span>
                    <p className="text-sm font-bold text-slate-900">{plrsRecord.holdingCategory}</p>
                    <p className="text-xs font-semibold text-amber-700">Total: {plrsRecord.landAcres} Acres</p>
                  </div>
                </div>
                {plrsRecord.bankName && (
                  <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3">
                    <span className="material-symbols-outlined text-emerald-700">account_balance</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{plrsRecord.bankName} (simulated, demo data only)</p>
                      <p className="font-mono text-xs text-slate-500">
                        A/C ****{plrsRecord.bankAccountLast4} · IFSC {plrsRecord.bankIfsc}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Land &amp; Crop Declaration</h2>
                  <span className="font-mono text-sm font-bold text-emerald-800">{totalQuota.toFixed(1)} Qtl total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                        <th className="px-3 py-2">Khewat/Khatauni</th>
                        <th className="px-3 py-2">Khasra No.</th>
                        <th className="px-3 py-2">Area</th>
                        <th className="px-3 py-2">Crop / Variety</th>
                        <th className="px-3 py-2 text-right">Est. Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plrsRecord.landParcels.map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-800">{p.khewatKhatauni}</td>
                          <td className="px-3 py-2 font-mono">{p.khasraNumber}</td>
                          <td className="px-3 py-2">{p.areaAcres} Acres</td>
                          <td className="px-3 py-2">
                            {cropLabel(p.crop, "en")} · {p.variety}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">{p.estimatedYieldQtl} Qtl</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {mode === "manual" && (
            <section className="grid grid-cols-1 gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
              <h2 className="col-span-full text-sm font-bold text-slate-900">Manual Farmer Details</h2>
              <input
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
              <input
                required
                placeholder="10-digit phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  resetConsent();
                }}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
              <input
                placeholder="Village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
              <input
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
              <input
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </section>
          )}

          {(plrsRecord || (mode === "manual" && phone.length === 10)) && (
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Farmer Consent (Mandatory)</h2>
              <p className="text-xs text-slate-500">
                Confirm the farmer has authorized{" "}
                <span className="font-semibold text-slate-700">{user?.name ?? "you"}</span> for MSP procurement this season.
                Verified via a real OTP sent to their phone.
              </p>

              {consentToken ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  OTP verified on +91 {effectivePhone}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {otpSent && displayedOtp && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          No SMS gateway connected — code
                        </span>
                        <span className="font-mono text-lg font-black tracking-[0.3em] text-amber-900">{displayedOtp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(displayedOtp)}
                        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        Fill in
                      </button>
                    </div>
                  )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || effectivePhone.length !== 10}
                      className="h-10 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {sendingOtp ? "Sending…" : `Send OTP to +91 ${effectivePhone}`}
                    </button>
                  ) : (
                    <>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter OTP"
                        className="h-10 w-40 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || !otpCode}
                        className="h-10 rounded-lg bg-emerald-900 px-4 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {verifyingOtp ? "Verifying…" : "Verify Code"}
                      </button>
                      <button type="button" onClick={handleSendOtp} className="text-xs font-bold text-emerald-800 hover:underline">
                        Resend
                      </button>
                    </>
                  )}
                </div>
                </div>
              )}
              {consentError && <p className="text-xs font-medium text-red-700">{consentError}</p>}
            </section>
          )}
        </div>

        {/* RIGHT: booking decision + slot */}
        <aside className="flex flex-col gap-5 lg:col-span-4">
          <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-md">
            <h2 className="text-sm font-bold text-slate-900">Slot Booking Option</h2>
            <div className="flex flex-col gap-2">
              <label className={`flex flex-col gap-1 rounded-lg border-2 p-3 cursor-pointer ${decision === "immediate" ? "border-emerald-800 bg-emerald-50" : "border-transparent bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={decision === "immediate"} onChange={() => setDecision("immediate")} />
                  <span className="text-xs font-bold text-slate-900">Book slot now</span>
                </div>
                <span className="pl-6 text-[11px] text-slate-500">Link farmer and immediately book a delivery slot.</span>
              </label>
              <label className={`flex flex-col gap-1 rounded-lg border-2 p-3 cursor-pointer ${decision === "roster" ? "border-emerald-800 bg-emerald-50" : "border-transparent bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={decision === "roster"} onChange={() => setDecision("roster")} />
                  <span className="text-xs font-bold text-slate-900">Add to roster only</span>
                </div>
                <span className="pl-6 text-[11px] text-slate-500">Save the farmer now; book a slot later.</span>
              </label>
            </div>

            {decision === "immediate" && (
              <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Mandi Centre</label>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                    {centre?.name ?? "—"}
                    <span className="material-symbols-outlined text-[18px] text-slate-400">store</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Crop</label>
                  <select value={crop} onChange={(e) => setCrop(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm">
                    {CROPS.map((c) => (
                      <option key={c} value={c}>
                        {cropLabel(c, "en")} (MSP ₹{mspRate(c)}/Qtl)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Date</label>
                    <select value={day} onChange={(e) => setDay(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm">
                      {days.map((d) => (
                        <option key={d.date} value={d.date}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Time Window</label>
                    <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm">
                      {timeWindows.map((w) => (
                        <option key={w.timeWindow} value={w.timeWindow} disabled={w.availableSlots === 0}>
                          {w.timeWindow} ({w.availableSlots} left)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">{selectedFreeSlots} slots free in this window.</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Quantity (Qtl)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={quantityQtl}
                    onChange={(e) => setQuantityQtl(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Vehicle Number (optional)</label>
                  <input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Driver Name (optional)</label>
                  <input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={moistureDeclared} onChange={(e) => setMoistureDeclared(e.target.checked)} />
                  Farmer declares the crop meets moisture standards
                </label>
              </div>
            )}

            {submitError && <p className="text-xs font-medium text-red-700">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-900 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
              {decision === "immediate" ? "Add Farmer & Book Slot" : "Add to Roster"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/agent")}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-900">Rules &amp; Guidelines</h3>
            <p className="text-xs text-slate-600">
              <strong>One Farmer, One Arhtiya:</strong> a farmer can be linked to only one commission agent at a time in
              this system — adding them here links them to your roster exclusively.
            </p>
            <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
              Need help? Call the Kisan Helpline: <span className="font-bold text-emerald-800">1800-180-2060</span>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
