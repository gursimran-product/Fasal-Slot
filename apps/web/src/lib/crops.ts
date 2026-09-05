import type { Language } from "@fasal-slot/types";
import { t } from "./i18n";

export const CROPS = ["wheat", "paddy"] as const;
export type Crop = (typeof CROPS)[number];

export function cropLabel(crop: string, language: Language): string {
  if (crop === "wheat") return t("cropWheat", language);
  if (crop === "paddy") return t("cropPaddy", language);
  return crop;
}
