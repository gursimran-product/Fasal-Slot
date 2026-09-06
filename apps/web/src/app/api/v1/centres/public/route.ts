import { NextResponse } from "next/server";
import { listCentres } from "@/server/centres";

// Unauthenticated by design: a directory of participating mandis is not
// sensitive, and the login page needs it before a session exists.
export async function GET() {
  const centres = await listCentres({});

  // Dev seed data can be re-applied and isn't idempotent for centres, which
  // would otherwise surface as duplicate options in this dropdown.
  const seen = new Set<string>();
  const deduped = centres.filter((c) => {
    const key = `${c.name}|${c.state ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    centres: deduped.map((c) => ({ id: c.id, name: c.name, state: c.state })),
  });
}
