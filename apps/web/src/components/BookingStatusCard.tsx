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
const STAGE_ICON: Record<BookingStage, string> = {
  booked: "◔",
  arrived: "◑",
  weighed: "◕",
  accepted: "●",
  paid: "✓",
  rejected: "✕",
  cancelled: "✕",
};
const STAGE_CHIP_CLASS: Record<BookingStage, string> = {
  booked: "border-[#0369A1] bg-[#E0F2FE] text-[#0369A1]",
  arrived: "border-[#B45309] bg-[#FEF3C7] text-[#B45309]",
  weighed: "border-[#4338CA] bg-[#EEF2FF] text-[#4338CA]",
  accepted: "border-[#15803D] bg-[#DCFCE7] text-[#15803D]",
  paid: "border-[#047857] bg-[#D1FAE5] text-[#047857]",
  rejected: "border-[#991B1B] bg-[#FEE2E2] text-[#991B1B]",
  cancelled: "border-slate-500 bg-slate-100 text-slate-600",
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
    <div className="w-full overflow-hidden rounded-lg bg-canopy shadow-token">
      {/* Token header — mimics a physical gate slip */}
      <div className="flex items-center justify-between px-5 py-3 text-white">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-emerald-200/90">
          {t("yourSlot", language)}
        </span>
        <span className="font-mono text-sm font-bold tracking-wider">№ {booking.refCode}</span>
      </div>

      {/* Perforated tear line */}
      <div className="token-notch h-0 border-t-2 border-dashed border-white/30" />

      <div className="bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-lg font-bold text-slate-ink">{cropLabel(booking.crop, language)}</p>
            <p className="font-mono text-base text-slate-600">
              {booking.date} · {booking.timeWindow}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded border-2 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide ${STAGE_CHIP_CLASS[booking.stage]}`}
          >
            <span aria-hidden>{STAGE_ICON[booking.stage]}</span>
            {t(STAGE_LABEL_KEY[booking.stage], language)}
          </span>
        </div>

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
                        ? "bg-[#991B1B]"
                        : done
                          ? "bg-canopy"
                          : "bg-slate-300"
                    }`}
                  />
                  <span className="text-center font-sans text-xs text-slate-600">
                    {isRejectedPoint ? t("stageRejected", language) : t(STAGE_LABEL_KEY[stage], language)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isRejected && booking.rejectReason && (
          <p className="mt-3 rounded border border-[#991B1B]/30 bg-[#FEE2E2] px-3 py-2 font-body text-base font-medium text-[#991B1B]">
            {booking.rejectReason}
          </p>
        )}

        {isCancelled && (
          <p className="mt-1 font-body text-base font-medium text-slate-600">{t("stageCancelled", language)}</p>
        )}

        {booking.stage === "paid" && booking.amountPaid != null && (
          <p className="mt-3 font-mono text-lg font-bold text-[#047857]">
            {t("amountPaid", language)}: ₹{booking.amountPaid.toLocaleString("en-IN")}
          </p>
        )}

        {(isRejected || isCancelled) && onBookAgain && (
          <button
            type="button"
            onClick={onBookAgain}
            className="mt-4 min-h-[52px] w-full rounded bg-canopy font-sans text-lg font-bold text-white transition hover:bg-canopy-deep active:translate-y-0.5"
          >
            {t("bookAgain", language)}
          </button>
        )}
      </div>
    </div>
  );
}
