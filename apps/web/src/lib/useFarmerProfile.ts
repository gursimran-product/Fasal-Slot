"use client";

import { useEffect, useState } from "react";
import type { Farmer } from "@fasal-slot/types";
import { useAuth } from "./auth-context";

export function useFarmerProfile() {
  const { user, authFetch } = useAuth();
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
        if (!cancelled) setFarmer(profile);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  return { farmer, setFarmer, loading };
}
