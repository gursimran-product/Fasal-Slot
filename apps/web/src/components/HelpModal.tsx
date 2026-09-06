export function HelpModal({
  text,
  closeLabel,
  onClose,
}: {
  text: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-ink/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border-2 border-canopy bg-white p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-canopy text-4xl text-white">
          ☎
        </div>
        <p className="mb-6 font-body text-lg leading-relaxed text-slate-ink">{text}</p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[52px] w-full rounded border-2 border-slate-500 font-sans text-lg font-bold text-slate-ink transition hover:bg-chalk"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
