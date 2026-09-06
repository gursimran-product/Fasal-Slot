import Mixpanel from "mixpanel";
import type { AuthUser } from "@fasal-slot/types";

const token = process.env.MIXPANEL_TOKEN;
const mixpanel = token ? Mixpanel.init(token) : null;

export type SignInMethod = "password" | "otp" | "agent_mpin";

export function trackSignIn(user: AuthUser, method: SignInMethod) {
  mixpanel?.track("Signed In", {
    distinct_id: user.id,
    role: user.role,
    method,
    centre_id: user.centreId ?? undefined,
  });
}

export function trackSignUp(user: AuthUser, method: SignInMethod) {
  mixpanel?.track("Signed Up", {
    distinct_id: user.id,
    role: user.role,
    method,
    centre_id: user.centreId ?? undefined,
  });
}
