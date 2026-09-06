"use client";

import mixpanel from "mixpanel-browser";
import type { AuthUser } from "@fasal-slot/types";

const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

if (token) {
  mixpanel.init(token, {
    track_pageview: true,
    record_sessions_percent: 100,
    // Show everything by default so replays are actually useful, and pull
    // specific PII (phone/email/license numbers, tagged `.mp-mask`) back out.
    // Typed input values stay masked regardless (record_mask_all_inputs default).
    record_mask_all_text: false,
    record_mask_all_inputs: true,
  });
}

export function identifyUser(user: AuthUser) {
  if (!token) return;
  mixpanel.identify(user.id);
  mixpanel.people.set({
    role: user.role,
    centre_id: user.centreId ?? undefined,
  });
}

export function resetAnalytics() {
  if (!token) return;
  mixpanel.reset();
}
