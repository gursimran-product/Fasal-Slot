import { AuthGate } from "@/components/AuthGate";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
