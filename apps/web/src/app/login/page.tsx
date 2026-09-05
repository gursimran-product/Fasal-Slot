"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { LANGUAGES, t } from "@/lib/i18n";
import { FarmScene } from "@/components/FarmScene";
import { ApiError } from "@/lib/api";

type Step = "language" | "phone" | "otp";

export default function LoginPage() {
  const { status, requestOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("language");
  const [language, setLanguage] = useState<Language>("en");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{10}$/.test(phone)) {
      setError(t("invalidPhone", language));
      return;
    }
    setSubmitting(true);
    try {
      await requestOtp(phone);
      setStep("otp");
    } catch {
      setError(t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(phone, otp);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("invalidOtp", language) : t("somethingWrong", language));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="hidden bg-[#FFF7E6] lg:block">
        <FarmScene />
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {step === "language" && (
            <div className="animate-[fadein_0.2s_ease-out]" key="language">
              <h1 className="mb-8 text-2xl font-bold text-neutral-900">
                {t("selectLanguage", language)}
              </h1>
              <div className="flex flex-col gap-4">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setStep("phone");
                    }}
                    className="min-h-[60px] rounded-xl border-2 border-green-700 bg-white px-6 text-xl font-semibold text-green-900 transition hover:bg-green-50 active:bg-green-100"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="animate-[fadein_0.2s_ease-out]" key="phone">
              <button
                type="button"
                onClick={() => setStep("language")}
                className="mb-6 text-base font-medium text-green-800 underline underline-offset-2"
              >
                ← {t("back", language)}
              </button>
              <h1 className="mb-6 text-2xl font-bold text-neutral-900">
                {t("enterPhone", language)}
              </h1>
              <input
                type="tel"
                inputMode="numeric"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("phonePlaceholder", language)}
                className="mb-4 min-h-[60px] w-full rounded-xl border-2 border-neutral-400 px-4 text-xl text-neutral-900 placeholder:text-neutral-500 focus:border-green-700 focus:outline-none"
              />
              {error && <p className="mb-4 text-base font-medium text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[60px] w-full rounded-xl bg-green-700 text-xl font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
              >
                {t("sendOtp", language)}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="animate-[fadein_0.2s_ease-out]" key="otp">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="mb-6 text-base font-medium text-green-800 underline underline-offset-2"
              >
                ← {t("back", language)}
              </button>
              <h1 className="mb-2 text-2xl font-bold text-neutral-900">
                {t("enterOtp", language)}
              </h1>
              <p className="mb-6 text-lg text-neutral-700">{phone}</p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="mb-4 min-h-[60px] w-full rounded-xl border-2 border-neutral-400 px-4 text-center text-2xl tracking-[0.5em] text-neutral-900 focus:border-green-700 focus:outline-none"
              />
              {error && <p className="mb-4 text-base font-medium text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={submitting || otp.length !== 4}
                className="min-h-[60px] w-full rounded-xl bg-green-700 text-xl font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
              >
                {t("verifyOtp", language)}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
