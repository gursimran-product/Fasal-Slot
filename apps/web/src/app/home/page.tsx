"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FarmScene } from "@/components/FarmScene";

export default function FarmerHomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 h-48 w-48">
          <FarmScene />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-neutral-900">
          {user?.name ? `Welcome, ${user.name}` : "Welcome"}
        </h1>
        <p className="mb-10 text-center text-lg text-neutral-700">
          You have no booking yet. Slot booking is coming soon.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[60px] w-full rounded-xl border-2 border-neutral-400 text-xl font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
