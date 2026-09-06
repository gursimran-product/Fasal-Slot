"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Farmer } from "@fasal-slot/types";
import { useAuth } from "./auth-context";

export function useFarmerProfile() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "farmer") {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const res = await authFetch(`/farmers/${user.id}`);
      if (res.ok) {
        const { farmer: profile } = (await res.json()) as { farmer: Farmer };
        if (!cancelled) {
          setFarmer(profile);
          // A farmer with no name on file hasn't completed onboarding yet —
          // send them there from wherever they landed, rather than showing
          // dashboards with a blank identity.
          if (!profile.name && pathname !== "/onboarding") {
            router.replace("/onboarding");
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authFetch, pathname, router]);

  return { farmer, setFarmer, loading };
}
