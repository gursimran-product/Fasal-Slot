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
  changeLanguage: { en: "Language", hi: "भाषा", pa: "ਭਾਸ਼ਾ" },
  centresNearYou: { en: "Procurement centres", hi: "खरीद केंद्र", pa: "ਖਰੀਦ ਕੇਂਦਰ" },
  todaySlots: { en: "Today's slots", hi: "आज के स्लॉट", pa: "ਅੱਜ ਦੇ ਸਲਾਟ" },
  slotsAvailable: { en: "available", hi: "उपलब्ध", pa: "ਉਪਲਬਧ" },
  slotsFull: { en: "Full", hi: "पूरा भरा", pa: "ਪੂਰਾ ਭਰਿਆ" },
  bookASlot: { en: "Book a slot", hi: "स्लॉट बुक करें", pa: "ਸਲਾਟ ਬੁੱਕ ਕਰੋ" },
  selectCrop: { en: "Select your crop", hi: "अपनी फसल चुनें", pa: "ਆਪਣੀ ਫਸਲ ਚੁਣੋ" },
  selectCentre: { en: "Select a centre", hi: "केंद्र चुनें", pa: "ਕੇਂਦਰ ਚੁਣੋ" },
  selectDay: { en: "Select a day", hi: "दिन चुनें", pa: "ਦਿਨ ਚੁਣੋ" },
  selectTimeWindow: { en: "Select a time", hi: "समय चुनें", pa: "ਸਮਾਂ ਚੁਣੋ" },
  confirmBooking: { en: "Confirm booking", hi: "बुकिंग की पुष्टि करें", pa: "ਬੁਕਿੰਗ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ" },
  bookingConfirmed: { en: "Booking confirmed", hi: "बुकिंग पक्की हो गई", pa: "ਬੁਕਿੰਗ ਪੱਕੀ ਹੋ ਗਈ" },
  refCode: { en: "Reference code", hi: "संदर्भ कोड", pa: "ਹਵਾਲਾ ਕੋਡ" },
  cancelBooking: { en: "Cancel booking", hi: "बुकिंग रद्द करें", pa: "ਬੁਕਿੰਗ ਰੱਦ ਕਰੋ" },
  bookAgain: { en: "Book again", hi: "फिर से बुक करें", pa: "ਫਿਰ ਤੋਂ ਬੁੱਕ ਕਰੋ" },
  viewBooking: { en: "View booking", hi: "बुकिंग देखें", pa: "ਬੁਕਿੰਗ ਵੇਖੋ" },
  stageBooked: { en: "Booked", hi: "बुक हुआ", pa: "ਬੁੱਕ ਹੋਇਆ" },
  stageArrived: { en: "Arrived", hi: "पहुंच गए", pa: "ਪਹੁੰਚ ਗਏ" },
  stageWeighed: { en: "Weighed", hi: "तौल हुई", pa: "ਤੋਲ ਹੋਈ" },
  stageAccepted: { en: "Accepted", hi: "स्वीकृत", pa: "ਪ੍ਰਵਾਨ" },
  stageRejected: { en: "Rejected", hi: "अस्वीकृत", pa: "ਰੱਦ" },
  stagePaid: { en: "Paid", hi: "भुगतान हुआ", pa: "ਭੁਗਤਾਨ ਹੋਇਆ" },
  stageCancelled: { en: "Cancelled", hi: "रद्द", pa: "ਰੱਦ ਕੀਤਾ" },
  cropWheat: { en: "Wheat", hi: "गेहूं", pa: "ਕਣਕ" },
  cropPaddy: { en: "Paddy", hi: "धान", pa: "ਝੋਨਾ" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, language: Language): string {
  return strings[key][language];
}
