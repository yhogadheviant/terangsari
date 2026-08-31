import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";

export async function getRTContext(request?: Request) {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      rTUnitId: null,
      response: NextResponse.json(
        { error: "Belum login." },
        { status: 401 }
      ),
    };
  }

  const normalizedRole = String(session.role || "").trim().toUpperCase();

  if (normalizedRole === "SUPERADMIN") {
    const requested =
      request?.headers.get("x-rt-unit-id")?.trim() || null;

    if (!requested) {
      return {
        session,
        rTUnitId: null,
        response: NextResponse.json(
          { error: "Superadmin belum memilih RT aktif." },
          { status: 400 }
        ),
      };
    }

    return {
      session,
      rTUnitId: requested,
      response: null,
    };
  }

  if (!session.rTUnitId) {
    return {
      session,
      rTUnitId: null,
      response: NextResponse.json(
        { error: "Akun belum memiliki RT." },
        { status: 403 }
      ),
    };
  }

  return {
    session,
    rTUnitId: session.rTUnitId,
    response: null,
  };
}
