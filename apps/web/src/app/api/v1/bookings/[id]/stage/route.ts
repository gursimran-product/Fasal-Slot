import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { advanceBookingStage } from "@/server/bookings";

const VALID_STAGES = ["arrived", "weighed", "accepted", "rejected", "paid"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || user.role !== "govt_operator") {
    return NextResponse.json({ error: "only a centre operator can advance a booking's stage" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { stage, rejectReason, amountPaid, moisturePct, weighbridgeToken, gateNumber, jformNumber, utrReference } = body ?? {};

  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: `stage must be one of ${VALID_STAGES.join(", ")}` }, { status: 400 });
  }
  if (stage === "rejected" && (typeof rejectReason !== "string" || !rejectReason.trim())) {
    return NextResponse.json({ error: "rejectReason is required to reject a booking" }, { status: 400 });
  }

  const result = await advanceBookingStage(params.id, stage, "govt_operator", user.id, {
    rejectReason,
    amountPaid: typeof amountPaid === "number" ? amountPaid : undefined,
    moisturePct: typeof moisturePct === "number" ? moisturePct : undefined,
    weighbridgeToken: typeof weighbridgeToken === "string" ? weighbridgeToken : undefined,
    gateNumber: typeof gateNumber === "string" ? gateNumber : undefined,
    jformNumber: typeof jformNumber === "string" ? jformNumber : undefined,
    utrReference: typeof utrReference === "string" ? utrReference : undefined,
  });

  if (result === "not_found") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (result === "invalid_transition") {
    return NextResponse.json({ error: `cannot move to ${stage} from the booking's current stage` }, { status: 409 });
  }
  if (result === "reject_reason_required") {
    return NextResponse.json({ error: "rejectReason is required to reject a booking" }, { status: 400 });
  }

  return NextResponse.json({ booking: result });
}
