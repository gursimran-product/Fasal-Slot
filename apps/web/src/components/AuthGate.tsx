"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@fasal-slot/types";
import { useAuth } from "@/lib/auth-context";

export function AuthGate({
  children,
  allowRoles,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  allowRoles?: AuthUser["role"][];
  redirectTo?: string;
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const roleAllowed = !allowRoles || (user && allowRoles.includes(user.role));

  useEffect(() => {
    if (status === "unauthenticated") router.replace(redirectTo);
    else if (status === "authenticated" && !roleAllowed) router.replace(redirectTo);
  }, [status, roleAllowed, router, redirectTo]);

  if (status !== "authenticated" || !roleAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-lg text-neutral-700">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
