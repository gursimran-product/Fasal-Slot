"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Farmer, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { FarmScene } from "@/components/FarmScene";
import { CentresList } from "@/components/CentresList";
import { LANGUAGES, t } from "@/lib/i18n";

export default function FarmerHomePage() {
  const { user, logout, authFetch } = useAuth();
  const router = useRouter();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [languageSaving, setLanguageSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "farmer") return;
    let cancelled = false;

    (async () => {
      const res = await authFetch(`/farmers/${user.id}`);
      if (!res.ok) return;
      const { farmer: profile } = (await res.json()) as { farmer: Farmer };
      if (!cancelled) setFarmer(profile);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleLanguageChange(language: Language) {
    if (!user || languageSaving) return;
    setLanguageSaving(true);
    try {
      const res = await authFetch(`/farmers/${user.id}/language`, {
        method: "PUT",
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        const { farmer: updated } = (await res.json()) as { farmer: Farmer };
        setFarmer(updated);
      }
    } finally {
      setLanguageSaving(false);
    }
  }

  const language: Language = farmer?.language ?? "en";

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 h-40 w-40">
          <FarmScene />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-neutral-900">
          {t("welcome", language)}, {farmer?.name ?? user?.name ?? ""}
        </h1>
        {farmer?.village && (
          <p className="mb-4 text-center text-base text-neutral-600">{farmer.village}</p>
        )}
        <p className="mb-6 text-center text-lg text-neutral-700">
          You have no booking yet. Slot booking is coming soon.
        </p>

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-neutral-700">
            {t("changeLanguage", language)}
          </p>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                disabled={languageSaving}
                onClick={() => handleLanguageChange(lang.code)}
                className={`min-h-[48px] flex-1 rounded-lg border-2 text-base font-semibold transition disabled:opacity-60 ${
                  language === lang.code
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-neutral-400 text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <CentresList language={language} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[60px] w-full rounded-xl border-2 border-neutral-400 text-xl font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          {t("logout", language)}
        </button>
      </div>
    </div>
  );
}
