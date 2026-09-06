import type { ReactNode } from "react";
import Image from "next/image";

export function BrandBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-canopy px-6 py-4 sm:px-10">
      <div className="flex items-center gap-3">
        <Image src="/fasal-slot-emblem.png" alt="Fasal Slot" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
        <div className="leading-tight">
          <p className="font-sans text-lg font-bold text-white">Fasal Slot</p>
          <p className="text-xs font-medium text-emerald-200/80">MSP Procurement</p>
        </div>
      </div>
      {children}
    </header>
  );
}
