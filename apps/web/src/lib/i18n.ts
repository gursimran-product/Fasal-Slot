import type { Language } from "@fasal-slot/types";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

const strings = {
  selectLanguage: { en: "Select your language", hi: "अपनी भाषा चुनें", pa: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ" },
  continue: { en: "Continue", hi: "जारी रखें", pa: "ਜਾਰੀ ਰੱਖੋ" },
  enterPhone: { en: "Enter your phone number", hi: "अपना फ़ोन नंबर डालें", pa: "ਆਪਣਾ ਫ਼ੋਨ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  phonePlaceholder: { en: "10-digit mobile number", hi: "10 अंकों का मोबाइल नंबर", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter the code sent to", hi: "इस नंबर पर भेजा गया कोड डालें", pa: "ਇਸ ਨੰਬਰ 'ਤੇ ਭੇਜਿਆ ਕੋਡ ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  invalidPhone: { en: "Enter a valid 10-digit number", hi: "मान्य 10 अंकों का नंबर डालें", pa: "ਵੈਧ 10 ਅੰਕਾਂ ਦਾ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  invalidOtp: { en: "Incorrect or expired code, try again", hi: "गलत या समाप्त कोड, दोबारा कोशिश करें", pa: "ਗਲਤ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ ਕੋਡ, ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ" },
  somethingWrong: { en: "Something went wrong, please try again", hi: "कुछ गलत हो गया, कृपया पुनः प्रयास करें", pa: "ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ, ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ" },
  welcome: { en: "Welcome to Fasal Slot", hi: "फसल स्लॉट में आपका स्वागत है", pa: "ਫਸਲ ਸਲਾਟ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ" },
  logout: { en: "Log out", hi: "लॉग आउट", pa: "ਲਾਗ ਆਊਟ" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, language: Language): string {
  return strings[key][language];
}
