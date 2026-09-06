"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking, Language } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";
import { useFarmerProfile } from "@/lib/useFarmerProfile";
import { BookingStatusCard } from "@/components/BookingStatusCard";
import { t } from "@/lib/i18n";

export default function HistoryPage() {
  const { user, authFetch } = useAuth();
  const { farmer } = useFarmerProfile();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (!user || user.role !== "farmer") return;
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/farmers/${user.id}/bookings`);
      if (res.ok) {
        const { bookings: list } = (await res.json()) as { bookings: Booking[] };
        if (!cancelled) setBookings(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  const language: Language = farmer?.language ?? "en";

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md">
        <Link href="/home" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{t("history", language)}</h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-5">
        {bookings === null && <p className="text-sm text-slate-500">{t("loadingGeneric", language)}</p>}
        {bookings && bookings.length === 0 && (
          <p className="text-sm font-bold text-slate-800">{t("noBookingHistory", language)}</p>
        )}
        {bookings?.map((booking) => (
          <BookingStatusCard
            key={booking.id}
            booking={booking}
            language={language}
            onBookAgain={() => router.push("/book")}
          />
        ))}
      </main>
    </div>
  );
}
