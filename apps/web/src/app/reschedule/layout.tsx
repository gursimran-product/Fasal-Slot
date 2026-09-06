import { AuthGate } from "@/components/AuthGate";

export default function RescheduleLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate allowRoles={["farmer"]}>{children}</AuthGate>;
}
