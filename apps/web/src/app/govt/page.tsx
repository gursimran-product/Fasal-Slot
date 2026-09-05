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
    router.replace("/staff/login");
  }

  const isOversight = user?.role === "govt_oversight";

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">
            {isOversight ? `Oversight — ${date}` : `Centre dashboard — ${date}`}
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 rounded-lg border border-neutral-400 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
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
                className="mb-4 text-sm font-medium text-green-800 underline underline-offset-2"
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
          <p className="text-lg text-neutral-700">No centre assigned to this account.</p>
        )}
      </div>
    </div>
  );
}
