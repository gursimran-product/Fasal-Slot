import { AuthGate } from "@/components/AuthGate";

export default function GovtLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate allowRoles={["govt_operator", "govt_oversight"]} redirectTo="/login?as=official">
      {children}
    </AuthGate>
  );
}
