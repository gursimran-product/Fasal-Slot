import { AuthGate } from "@/components/AuthGate";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate allowRoles={["agent"]} redirectTo="/staff/login">
      {children}
    </AuthGate>
  );
}
