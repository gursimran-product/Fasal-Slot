import { AuthGate } from "@/components/AuthGate";

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate allowRoles={["farmer"]}>{children}</AuthGate>;
}
