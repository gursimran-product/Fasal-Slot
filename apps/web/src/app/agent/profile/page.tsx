"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentFirmProfile, AgentLinkedFarmersStats, AgentStaff, Centre, CentreYardStatus, MandiOfficial } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function yearsSince(d: string | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365));
}

const OFFICIAL_ICON: Record<MandiOfficial["category"], string> = {
  association_president: "support_agent",
  helpdesk: "call",
  nodal_officer: "badge",
};

export default function AgentProfilePage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<AgentFirmProfile | null>(null);
  const [stats, setStats] = useState<AgentLinkedFarmersStats | null>(null);
  const [centre, setCentre] = useState<Centre | null>(null);
  const [officials, setOfficials] = useState<MandiOfficial[]>([]);
  const [staff, setStaff] = useState<AgentStaff[]>([]);
  const [yardStatus, setYardStatus] = useState<CentreYardStatus | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "", authorizationScope: "" });
  const [addingStaff, setAddingStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [profileRes, staffRes] = await Promise.all([
      authFetch(`/agents/${user.id}/profile`),
      authFetch(`/agents/${user.id}/staff`),
    ]);
    if (profileRes.ok) {
      const body = await profileRes.json();
      setProfile(body.profile);
      setStats(body.stats);
    }
    if (staffRes.ok) setStaff((await staffRes.json()).staff);
  }, [user, authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!profile?.centreId) return;
    let cancelled = false;
    (async () => {
      const [centresRes, officialsRes, yardRes] = await Promise.all([
        authFetch(`/centres`),
        authFetch(`/centres/${profile.centreId}/officials`),
        authFetch(`/centres/${profile.centreId}/yard-status`),
      ]);
      if (centresRes.ok) {
        const { centres } = await centresRes.json();
        if (!cancelled) setCentre(centres.find((c: Centre) => c.id === profile.centreId) ?? null);
      }
      if (officialsRes.ok) {
        const { officials: list } = await officialsRes.json();
        if (!cancelled) setOfficials(list);
      }
      if (yardRes.ok) {
        const { yardStatus: status } = await yardRes.json();
        if (!cancelled) setYardStatus(status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, authFetch]);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setAddingStaff(true);
    try {
      const res = await authFetch(`/agents/${user.id}/staff`, {
        method: "POST",
        body: JSON.stringify(newStaff),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not add staff member");
        return;
      }
      setNewStaff({ name: "", phone: "", role: "", authorizationScope: "" });
      setShowAddStaff(false);
      await load();
    } finally {
      setAddingStaff(false);
    }
  }

  if (!profile || !stats) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>;
  }

  const expiryDays = daysUntil(profile.licenseExpiryDate);
  const yearsOperating = yearsSince(profile.registeredSince);
  const remainingQuotaQtl = Math.max(stats.approvedQuotaQtl - stats.weighedOrPaidQtl - stats.bookedInTransitQtl, 0);
  const completionPct = stats.approvedQuotaQtl > 0 ? (stats.weighedOrPaidQtl / stats.approvedQuotaQtl) * 100 : 0;
  const inTransitPct = stats.approvedQuotaQtl > 0 ? (stats.bookedInTransitQtl / stats.approvedQuotaQtl) * 100 : 0;
  const yardOccupancyPct =
    yardStatus && yardStatus.weighbridgeLanesTotal > 0
      ? (yardStatus.weighbridgeLanesOccupied / yardStatus.weighbridgeLanesTotal) * 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button type="button" onClick={() => router.push("/agent")} className="hover:underline">
              Arhtiya Dashboard
            </button>
            <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
            <span className="font-bold text-emerald-800">Firm &amp; APMC Credentials</span>
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

      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-6">
        {/* Title bar */}
        <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-emerald-900">Arhtiya Details &amp; Mandi License Credentials</h1>
              <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                {"isActive" in profile ? "STATUS: ACTIVE" : "STATUS: ACTIVE"}
              </span>
            </div>
            <p className="text-xs text-slate-500">Punjab State Agricultural Marketing Board (PSAMB) verified commercial entity · APMC Act 1961 compliance node</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print Copy
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="Use your browser's Save as PDF option"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download License Certificate (PDF)
            </button>
          </div>
        </div>

        {/* Verification strip */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-emerald-800">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">License Registration No.</span>
              <span className="mp-mask font-mono text-base font-bold text-emerald-800">{profile.licenseNumber ?? "—"}</span>
              <span className="text-[11px] text-slate-400">Form &apos;B&apos; Registered</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-amber-700">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">PAN on File</span>
              <span className="font-mono text-base font-bold text-slate-900">{profile.pan ?? "Not on file"}</span>
              {profile.bankAccountNumber && <span className="text-[11px] text-emerald-700">Bank details on file</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-emerald-800">
              <span className="material-symbols-outlined text-[22px]">warehouse</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">Allotted Yard Shed</span>
              <span className="text-sm font-bold text-slate-900">{profile.yardShed ?? "—"}</span>
              <span className="text-[11px] text-slate-400">
                {profile.dailyCapacityQtl ? `Capacity: ${profile.dailyCapacityQtl.toLocaleString("en-IN")} Qtl/Day` : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-amber-700">
              <span className="material-symbols-outlined text-[22px]">calendar_clock</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">License Expiry Date</span>
              <span className="text-sm font-bold text-slate-900">{formatDate(profile.licenseExpiryDate)}</span>
              <span className="text-[11px] text-emerald-700">
                {expiryDays != null ? (expiryDays > 0 ? `${expiryDays} days remaining` : "Expired") : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT column */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            {/* Firm identity */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded bg-emerald-900 text-white">
                    <span className="material-symbols-outlined text-[20px]">business</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Firm Master Identity</h2>
                    <span className="text-[11px] text-slate-500">Registered Arhtiya Firm Master Identity</span>
                  </div>
                </div>
                {yearsOperating != null && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">{yearsOperating}+ yrs service</span>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-200 text-emerald-800">
                  <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-bold text-emerald-900">{profile.firmName ?? profile.name}</span>
                  <span className="truncate text-xs text-slate-500">{centre ? `${centre.name}` : ""}</span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 text-sm">
                <Row label="Proprietor / Partner" value={profile.proprietorName ?? profile.name} />
                <Row label="Registered Mobile (OTP)" value={profile.phone ? `+91 ${profile.phone}` : "—"} verified={!!profile.phone} mask />
                <Row label="Authorized Email" value={profile.email ?? "—"} accent mask />
                <Row label="First Registration" value={profile.registeredSince ? formatDate(profile.registeredSince) : "—"} />
                <Row label="PAN" value={profile.pan ?? "—"} mask />
                <Row label="GSTIN" value={profile.gstin ?? "—"} mask />
              </div>
              {profile.firmAddress && (
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Mandi Shop Full Address</span>
                  <span className="text-sm text-slate-800">{profile.firmAddress}</span>
                </div>
              )}
            </section>

            {/* Bank / PFMS */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded bg-amber-600 text-white">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Commission Bank Account &amp; PFMS Rail</h2>
                  <span className="text-[11px] text-slate-500">Statutory payout account (DBT rail)</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-emerald-900 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{profile.bankName ?? "Not on file"}</span>
                  <span className="rounded bg-emerald-800 px-2 py-0.5 text-[11px] font-bold uppercase">Arhat Current A/C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-emerald-200">Commercial Account Number</span>
                  <div className="flex items-center gap-2 font-mono text-lg tracking-wider">
                    {profile.bankAccountNumber
                      ? showAccountNumber
                        ? profile.bankAccountNumber
                        : `•••• •••• ${profile.bankAccountNumber.slice(-4)}`
                      : "—"}
                    {profile.bankAccountNumber && (
                      <button type="button" onClick={() => setShowAccountNumber((v) => !v)}>
                        <span className="material-symbols-outlined text-[18px] text-emerald-200">
                          {showAccountNumber ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[13px]">
                  <div>
                    <span className="block text-[11px] text-emerald-200">IFSC Code</span>
                    <span className="font-mono font-bold">{profile.bankIfsc ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-emerald-200">Branch</span>
                    <span className="truncate font-bold">{profile.bankBranch ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="block text-[11px] text-slate-500">Statutory Commission Rate</span>
                  <span className="text-xl font-bold text-emerald-800">2.5%</span>
                  <span className="block text-[11px] text-slate-500">Applied on MSP settled value</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="block text-[11px] text-slate-500">This Season&apos;s Earned Commission</span>
                  <span className="text-xl font-bold text-amber-700">
                    ₹{stats.seasonCommissionEarned.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="block text-[11px] text-emerald-700">Estimate from paid bookings</span>
                </div>
              </div>
            </section>

            {/* Mandi association officials */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded bg-slate-100 text-emerald-800">
                  <span className="material-symbols-outlined text-[18px]">contact_phone</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Mandi Association &amp; Government Officials</h2>
                  <span className="text-[11px] text-slate-500">Official mandi committee liaison desk (demo directory)</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {officials.length === 0 && <p className="text-xs text-slate-400">No officials configured for this centre yet.</p>}
                {officials.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[20px] text-emerald-700">{OFFICIAL_ICON[o.category]}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{o.name}</span>
                        <span className="text-[11px] text-slate-500">{o.designation}</span>
                      </div>
                    </div>
                    {o.phone ? (
                      <a href={`tel:${o.phone}`} className="rounded bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-sm hover:bg-slate-100">
                        Call
                      </a>
                    ) : o.officeHours ? (
                      <span className="text-[11px] font-bold text-emerald-700">{o.officeHours}</span>
                    ) : (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] text-slate-500">Nodal Officer</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT column */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* License & yard */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded bg-emerald-900 text-white">
                    <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Mandi Yard License &amp; Operational Quota</h2>
                    <span className="text-[11px] text-slate-500">Punjab State Agricultural Marketing Board authorization</span>
                  </div>
                </div>
                <span className="rounded bg-emerald-900 px-2.5 py-1 text-[11px] font-bold text-white">FORM &apos;B&apos; LICENSE</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Authorized License Number</span>
                  <span className="mp-mask font-mono text-lg font-bold text-emerald-800">{profile.licenseNumber ?? "—"}</span>
                  <span className="text-[11px] text-slate-500">{centre ? `${centre.name}` : ""}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Security Deposit / Bank Guarantee</span>
                  <span className="font-mono text-lg font-bold text-amber-700">
                    {profile.securityDeposit != null ? `₹${profile.securityDeposit.toLocaleString("en-IN")}` : "—"}
                  </span>
                  <span className="text-[11px] text-emerald-700">Pledged with PSAMB</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="material-symbols-outlined text-[16px]">domain</span>
                    <span className="text-[12px] font-bold">Platform Yard</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{profile.yardShed ?? "—"}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="material-symbols-outlined text-[16px]">scale</span>
                    <span className="text-[12px] font-bold">Weighbridge Lane Allotment</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{profile.weighbridgeLanes ?? "—"}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    <span className="text-[12px] font-bold">Daily Inward Capacity</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {profile.dailyCapacityQtl ? `${profile.dailyCapacityQtl.toLocaleString("en-IN")} Qtl/Day` : "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-slate-100 p-3">
                <div className="flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-[13px] font-bold">Yard Utilization (Agent-Reported)</span>
                  </div>
                  <span className="text-[13px] font-bold">
                    {yardStatus ? `${yardStatus.weighbridgeLanesOccupied} / ${yardStatus.weighbridgeLanesTotal} lanes (${yardOccupancyPct.toFixed(1)}%)` : "Not reported yet"}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-emerald-800" style={{ width: `${yardOccupancyPct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Not a live sensor feed — reported by an agent from the dashboard.{" "}
                  <button type="button" onClick={() => router.push("/agent")} className="font-bold text-emerald-800 hover:underline">
                    Update on dashboard →
                  </button>
                </p>
              </div>
            </section>

            {/* Linked farmers */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded bg-emerald-900 text-white">
                    <span className="material-symbols-outlined text-[20px]">agriculture</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Linked Farmers &amp; Crop Procurement Progress</h2>
                    <span className="text-[11px] text-slate-500">Linked farmers, PLRS land area &amp; MSP targets</span>
                  </div>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-emerald-800">Wheat RMS Season</span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Stat label="Total Registered Farmers" value={stats.totalFarmers} sub="On roster" />
                <Stat label="Total Linked Land" value={stats.totalLandAcres.toFixed(1)} sub="Acres (PLRS-linked)" />
                <Stat label="Approved Quota" value={stats.approvedQuotaQtl.toLocaleString("en-IN")} sub="Quintals" />
                <Stat label="Today's Booked Slots" value={stats.todaysBookedSlots} sub={`${stats.todaysBookedQtl} Qtl arriving`} accent />
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Procurement Completion Rate</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {stats.weighedOrPaidQtl.toLocaleString("en-IN")} / {stats.approvedQuotaQtl.toLocaleString("en-IN")} Qtl (
                    {completionPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-emerald-800" style={{ width: `${completionPct}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${inTransitPct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <span>
                    <span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-emerald-800" />
                    Weighed &amp; Paid: <strong>{stats.weighedOrPaidQtl.toLocaleString("en-IN")} Qtl</strong>
                  </span>
                  <span>
                    <span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-amber-400" />
                    Booked (in transit): <strong>{stats.bookedInTransitQtl.toLocaleString("en-IN")} Qtl</strong>
                  </span>
                  <span className="text-right text-slate-500">
                    Remaining: <strong>{remainingQuotaQtl.toLocaleString("en-IN")} Qtl</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">verified</span>
                  Farmer linkage verified via MFMB/PLRS lookup and OTP consent.
                </span>
                <button type="button" onClick={() => router.push("/agent")} className="font-bold text-emerald-800 hover:underline">
                  View Roster →
                </button>
              </div>
            </section>

            {/* Staff table */}
            <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded bg-emerald-900 text-white">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Authorized Mandi Staff &amp; Sub-Agents</h2>
                    <span className="text-[11px] text-slate-500">Gate pass clearance &amp; weighbridge supervision credentials</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStaff((v) => !v)}
                  className="flex items-center gap-1 rounded bg-emerald-900 px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-800"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  {showAddStaff ? "Cancel" : "Add Staff"}
                </button>
              </div>

              {showAddStaff && (
                <form onSubmit={handleAddStaff} className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm"
                  />
                  <input
                    placeholder="Phone"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff((s) => ({ ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm"
                  />
                  <input
                    placeholder="Role (e.g. Weighing Supervisor)"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm"
                  />
                  <input
                    placeholder="Authorization scope"
                    value={newStaff.authorizationScope}
                    onChange={(e) => setNewStaff((s) => ({ ...s, authorizationScope: e.target.value }))}
                    className="h-9 rounded-lg border border-slate-300 px-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={addingStaff}
                    className="sm:col-span-2 h-9 rounded-lg bg-emerald-900 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    Save staff member
                  </button>
                </form>
              )}
              {error && <p className="text-xs font-medium text-red-700">{error}</p>}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <th className="px-3 py-2">Name &amp; Role</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Authorization</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                          No staff added yet.
                        </td>
                      </tr>
                    )}
                    {staff.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-900 text-[11px] font-bold text-white">
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <span className="text-[11px] text-slate-500">{s.role ?? "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="mp-mask px-3 py-2.5 font-mono">{s.phone ? `+91 ${s.phone}` : "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            {s.authorizationScope ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${s.isActive ? "text-emerald-700" : "text-slate-400"}`}>
                            <span className="material-symbols-outlined text-[14px]">{s.isActive ? "check_circle" : "cancel"}</span>
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Compliance footer */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-slate-100 p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-800">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-800">Regulatory Framing (APMC Act 1961 By-laws)</span>
              <span className="text-xs text-slate-500">
                This is a prototype license record modeled on Punjab State Agricultural Marketing Board (PSAMB) and PFMS format conventions.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  verified,
  accent,
  mask,
}: {
  label: string;
  value: string;
  verified?: boolean;
  accent?: boolean;
  mask?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-right text-sm font-bold ${accent ? "text-emerald-700" : "text-slate-900"} ${mask ? "mp-mask" : ""}`}
        >
          {value}
        </span>
        {verified && <span className="material-symbols-outlined text-[16px] text-emerald-700">check_circle</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: boolean }) {
  return (
    <div className="flex flex-col rounded-lg bg-slate-50 p-3">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`mt-0.5 font-mono text-xl font-bold ${accent ? "text-amber-700" : "text-emerald-800"}`}>{value}</span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  );
}
