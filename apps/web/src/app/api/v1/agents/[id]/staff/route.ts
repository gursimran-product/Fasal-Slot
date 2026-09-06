import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { addAgentStaff, listAgentStaff } from "@/server/agents";

function canAccess(userId: string, userRole: string, agentId: string): boolean {
  if (userRole === "agent") return userId === agentId;
  return userRole === "govt_operator" || userRole === "govt_oversight";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || !canAccess(user.id, user.role, params.id)) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }
  const staff = await listAgentStaff(params.id);
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent" || user.id !== params.id) {
    return NextResponse.json({ error: "only the agent can add their own staff" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, phone, role, authorizationScope } = body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const staff = await addAgentStaff(params.id, {
    name: name.trim(),
    phone: typeof phone === "string" ? phone : null,
    role: typeof role === "string" ? role : null,
    authorizationScope: typeof authorizationScope === "string" ? authorizationScope : null,
  });
  return NextResponse.json({ staff }, { status: 201 });
}
