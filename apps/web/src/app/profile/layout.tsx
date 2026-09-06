import { AuthGate } from "@/components/AuthGate";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate allowRoles={["farmer"]}>{children}</AuthGate>;
}
