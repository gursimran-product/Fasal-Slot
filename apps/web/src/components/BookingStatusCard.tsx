import type { Booking, BookingStage, Language } from "@fasal-slot/types";
import { t, type StringKey } from "@/lib/i18n";
import { cropLabel } from "@/lib/crops";

const STAGE_ORDER: BookingStage[] = ["booked", "arrived", "weighed", "accepted", "paid"];
const STAGE_LABEL_KEY: Record<BookingStage, StringKey> = {
  booked: "stageBooked",
  arrived: "stageArrived",
  weighed: "stageWeighed",
  accepted: "stageAccepted",
  rejected: "stageRejected",
  paid: "stagePaid",
  cancelled: "stageCancelled",
};

export function BookingStatusCard({
  booking,
  language,
  onBookAgain,
}: {
  booking: Booking;
  language: Language;
  onBookAgain?: () => void;
}) {
  const isRejected = booking.stage === "rejected";
  const isCancelled = booking.stage === "cancelled";
  const currentIndex = isRejected
    ? STAGE_ORDER.indexOf("weighed")
    : STAGE_ORDER.indexOf(booking.stage);

  return (
    <div className="w-full rounded-xl border-2 border-neutral-300 p-5">
      <p className="text-sm font-medium text-neutral-600">{t("refCode", language)}</p>
      <p className="mb-4 text-2xl font-bold tracking-wide text-neutral-900">{booking.refCode}</p>
      <p className="mb-1 text-lg font-semibold text-neutral-900">{cropLabel(booking.crop, language)}</p>
      <p className="mb-4 text-base text-neutral-700">
        {booking.date} · {booking.timeWindow}
      </p>

      {!isCancelled && (
        <div className="mb-2 flex items-center gap-1">
          {STAGE_ORDER.map((stage, i) => {
            const done = i <= currentIndex && !isRejected;
            const isRejectedPoint = isRejected && stage === "accepted";
            return (
              <div key={stage} className="flex flex-1 flex-col items-center">
                <div
                  className={`mb-1 h-3 w-3 rounded-full ${
                    isRejectedPoint
                      ? "bg-red-600"
                      : done
                        ? "bg-green-700"
                        : "bg-neutral-300"
                  }`}
                />
                <span className="text-center text-xs text-neutral-600">
                  {isRejectedPoint ? t("stageRejected", language) : t(STAGE_LABEL_KEY[stage], language)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isRejected && booking.rejectReason && (
        <p className="mt-3 text-base font-medium text-red-700">{booking.rejectReason}</p>
      )}

      {isCancelled && (
        <p className="mt-1 text-base font-medium text-neutral-600">{t("stageCancelled", language)}</p>
      )}

      {(isRejected || isCancelled) && onBookAgain && (
        <button
          type="button"
          onClick={onBookAgain}
          className="mt-4 min-h-[52px] w-full rounded-xl bg-green-700 text-lg font-semibold text-white transition hover:bg-green-800"
        >
          {t("bookAgain", language)}
        </button>
      )}
    </div>
  );
}
