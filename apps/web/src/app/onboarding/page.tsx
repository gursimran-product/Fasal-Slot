"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { LANGUAGES, t } from "@/lib/i18n";

export default function OnboardingPage() {
  const { user, status, authFetch } = useAuth();
  const { farmer, setFarmer, loading } = useFarmerProfile();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (user && user.role !== "farmer") {
      router.replace(user.role === "agent" ? "/agent" : "/govt");
    }
  }, [status, user, router]);

  const [language, setLanguage] = useState<Language>("en");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmer) return;
    // Already onboarded (has a real name) — nothing to do here.
    if (farmer.name) {
      router.replace("/home");
      return;
    }
    setLanguage(farmer.language);
    setVillage(farmer.village ?? "");
    setDistrict(farmer.district ?? "");
    setState(farmer.state ?? "");
  }, [farmer, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError(t("nameRequiredError", language));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/farmers/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), village, district, state }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? t("profileUpdateFailed", language));
        return;
      }
      const { farmer: updated } = await res.json();

      if (language !== farmer?.language) {
        await authFetch(`/farmers/${user.id}/language`, {
          method: "PUT",
          body: JSON.stringify({ language }),
        }).catch(() => {});
      }

      setFarmer({ ...updated, language });
      router.replace("/home");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !farmer) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">{t("loadingGeneric", "en")}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={48} height={48} className="mb-3 h-12 w-12 object-contain" />
          <h1 className="text-xl font-extrabold text-slate-900">{t("onboardingTitle", language)}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("onboardingSubtitle", language)}</p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`rounded-lg px-3 py-1.5 transition ${
                language === lang.code ? "bg-emerald-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-800">{t("nameLabel", language)} *</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-800">{t("villageLabel", language)}</label>
            <input
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-800">{t("districtLabel", language)}</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-800">{t("stateLabel", language)}</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-12 items-center justify-center rounded-xl bg-emerald-900 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-60"
          >
            {t("continueToDashboard", language)}
          </button>
        </form>
      </div>
    </div>
  );
}
