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

export interface LandParcel {
  khewatKhatauni: string;
  khasraNumber: string;
  areaAcres: number;
  crop: string;
  variety: string;
  estimatedYieldQtl: number;
}

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string | null;
  district: string | null;
  state: string | null;
  language: Language;
  aadhaarRef: string | null;
  landDetails: { parcels: LandParcel[] } | null;
  mfmbId: string | null;
  guardianName: string | null;
  holdingCategory: string | null;
  landAcres: number | null;
  bankName: string | null;
  bankAccountLast4: string | null;
  bankIfsc: string | null;
  agentId: string | null;
  consentAt: string | null;
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

// Simulated PLRS (Punjab Land Records Society) registry lookup result — not a
// live government integration, a fixed set of seeded demo fixtures an agent
// can look up by mobile / MFMB ID / Aadhaar last-4 when adding a farmer.
export interface PlrsRegistryRecord {
  mobile: string;
  mfmbId: string;
  aadhaarLast4: string;
  name: string;
  guardianName: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  holdingCategory: string | null;
  landAcres: number | null;
  bankName: string | null;
  bankAccountLast4: string | null;
  bankIfsc: string | null;
  landParcels: LandParcel[];
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

export interface AgentStaff {
  id: string;
  agentId: string;
  name: string;
  phone: string | null;
  role: string | null;
  authorizationScope: string | null;
  isActive: boolean;
  createdAt: string;
}

// Fixed per-centre civic directory fixtures (fictional demo data, same as the
// "Demo Agent"/"Demo Operator" test accounts) — not a live directory.
export interface MandiOfficial {
  id: string;
  centreId: string;
  name: string;
  designation: string;
  phone: string | null;
  category: "association_president" | "helpdesk" | "nodal_officer";
  officeHours: string | null;
}

export interface AgentFirmProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  centreId: string | null;
  firmName: string | null;
  proprietorName: string | null;
  pan: string | null;
  gstin: string | null;
  firmAddress: string | null;
  registeredSince: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  securityDeposit: number | null;
  yardShed: string | null;
  weighbridgeLanes: string | null;
  dailyCapacityQtl: number | null;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
}

export interface AgentLinkedFarmersStats {
  totalFarmers: number;
  totalLandAcres: number;
  approvedQuotaQtl: number;
  weighedOrPaidQtl: number;
  bookedInTransitQtl: number;
  todaysBookedSlots: number;
  todaysBookedQtl: number;
  seasonCommissionEarned: number;
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
  gateSupervisorPhone: string | null;
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
  quantityQtl: number | null;
  vehicleNumber: string | null;
  driverName: string | null;
  moistureDeclared: boolean;
  moisturePct: number | null;
  weighbridgeToken: string | null;
  gateNumber: string | null;
  jformNumber: string | null;
  utrReference: string | null;
  createdBy: CreatedBy;
  createdAt: string;
  arrivedAt: string | null;
  weighedAt: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

// Agent-reported yard status: manually entered by an agent at the centre,
// never a live sensor/IoT feed. updatedByAgentId + updatedAt let the UI show
// who reported it and when, so it's never presented as real-time telemetry.
export interface CentreYardStatus {
  centreId: string;
  weighbridgeLanesOccupied: number;
  weighbridgeLanesTotal: number;
  gunnyBagStockPct: number | null;
  storageLiftingPct: number | null;
  updatedByAgentId: string | null;
  updatedByAgentName: string | null;
  updatedAt: string | null;
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
