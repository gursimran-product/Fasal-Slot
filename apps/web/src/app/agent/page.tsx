"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AgentHomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/staff/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-300 bg-white p-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-neutral-900">Welcome, {user?.name}</h1>
        <p className="mb-6 text-base text-neutral-600">The agent booking tool is coming soon.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="h-11 w-full rounded-lg border border-neutral-400 text-base font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
