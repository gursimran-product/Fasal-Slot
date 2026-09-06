"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { CentreDashboard } from "@/components/CentreDashboard";
import { OversightRollup } from "@/components/OversightRollup";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GovtDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [viewingCentreId, setViewingCentreId] = useState<string | null>(null);
  const date = todayIso();

  async function handleLogout() {
    await logout();
    router.replace("/login?as=official");
  }

  const isOversight = user?.role === "govt_oversight";

  return (
    <div className="min-h-screen bg-chalk p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-sans text-2xl font-bold text-slate-ink">
              {isOversight ? "Oversight" : "Centre dashboard"}
            </h1>
            <p className="font-mono text-sm text-slate-600">{date}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 rounded border-[1.5px] border-slate-500 px-4 font-sans text-sm font-bold text-slate-ink hover:bg-white"
          >
            Log out
          </button>
        </div>

        {isOversight ? (
          viewingCentreId ? (
            <>
              <button
                type="button"
                onClick={() => setViewingCentreId(null)}
                className="mb-4 font-sans text-sm font-bold text-canopy underline underline-offset-2"
              >
                ← Back to all centres
              </button>
              <CentreDashboard centreId={viewingCentreId} canAct={false} />
            </>
          ) : (
            <OversightRollup onSelectCentre={setViewingCentreId} />
          )
        ) : user?.centreId ? (
          <CentreDashboard centreId={user.centreId} canAct />
        ) : (
          <p className="font-body text-lg text-slate-700">No centre assigned to this account.</p>
        )}
      </div>
    </div>
  );
}
