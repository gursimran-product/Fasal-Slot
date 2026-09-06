import { AuthGate } from "@/components/AuthGate";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate allowRoles={["agent"]} redirectTo="/login?as=agent">
      {children}
    </AuthGate>
  );
}
