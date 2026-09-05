export type Language = "en" | "hi" | "pa";

export type BookingStage =
  | "booked"
  | "arrived"
  | "weighed"
  | "accepted"
  | "rejected"
  | "paid"
  | "cancelled";

export type CreatedBy = "farmer" | "agent" | "helpline" | "govt";

export type GovtRole = "operator" | "oversight";

export type RiskLevel = "low" | "watch" | "high";

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string | null;
  district: string | null;
  state: string | null;
  language: Language;
  aadhaarRef: string | null;
  landDetails: Record<string, unknown> | null;
  agentId: string | null;
  consentAt: string | null;
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  centreId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Centre {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
  village: string | null;
  lat: number | null;
  lng: number | null;
  crops: string[];
  isActive: boolean;
  createdAt: string;
}

export interface CentreCapacity {
  id: string;
  centreId: string;
  date: string;
  timeWindow: string;
  totalSlots: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface CentreCapacityWithAvailability extends CentreCapacity {
  bookedCount: number;
  availableSlots: number;
}

export interface Booking {
  id: string;
  farmerId: string;
  centreId: string;
  agentId: string | null;
  crop: string;
  date: string;
  timeWindow: string;
  refCode: string;
  stage: BookingStage;
  rejectReason: string | null;
  amountPaid: number | null;
  createdBy: CreatedBy;
  createdAt: string;
  arrivedAt: string | null;
  weighedAt: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

export interface StatusEvent {
  id: string;
  bookingId: string;
  fromStage: BookingStage | null;
  toStage: BookingStage;
  triggeredBy: "farmer" | "agent" | "govt_operator" | "system";
  triggeredById: string | null;
  notes: string | null;
  createdAt: string;
}

export interface GovtUser {
  id: string;
  name: string;
  email: string;
  role: GovtRole;
  centreId: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  role: "farmer" | "agent" | "govt_operator" | "govt_oversight";
  name: string;
  phone?: string;
  email?: string;
  centreId?: string | null;
}
