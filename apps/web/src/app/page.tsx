"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated" || !user) return;

    if (user.role === "farmer") router.replace("/home");
    else if (user.role === "agent") router.replace("/agent");
    else router.replace("/govt");
  }, [status, user, router]);

  return null;
}
