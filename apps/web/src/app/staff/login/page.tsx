"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function StaffLoginPage() {
  const { status, user, loginWithPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.role === "govt_operator" || user.role === "govt_oversight") router.replace("/govt");
    else if (user.role === "agent") router.replace("/agent");
  }, [status, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Invalid email or password" : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-neutral-300 bg-white p-8">
        <h1 className="mb-6 text-xl font-bold text-neutral-900">Fasal Slot — Staff Login</h1>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 h-11 w-full rounded-lg border border-neutral-400 px-3 text-base text-neutral-900 focus:border-green-700 focus:outline-none"
        />
        <label className="mb-1 block text-sm font-medium text-neutral-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 h-11 w-full rounded-lg border border-neutral-400 px-3 text-base text-neutral-900 focus:border-green-700 focus:outline-none"
        />
        {error && <p className="mb-4 text-sm font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-lg bg-green-700 text-base font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
