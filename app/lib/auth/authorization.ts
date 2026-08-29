import { NextResponse } from "next/server";
import type { SessionUser } from "./session";

export type AppRole =
  | "SUPERADMIN"
  | "KETUA"
  | "SEKRETARIS"
  | "BENDAHARA"
  | "WARGA";

function normalizeRole(
  role: string | null | undefined
): AppRole | null {
  const value = String(role ?? "")
    .trim()
    .toUpperCase();

  if (
    value === "SUPERADMIN" ||
    value === "KETUA" ||
    value === "SEKRETARIS" ||
    value === "BENDAHARA" ||
    value === "WARGA"
  ) {
    return value;
  }

  return null;
}

export function hasRole(
  session: SessionUser,
  roles: AppRole[]
) {
  const role = normalizeRole(session.role);

  return role !== null && roles.includes(role);
}

export function requireRole(
  session: SessionUser | null,
  roles: AppRole[]
) {
  if (!session) {
    return NextResponse.json(
      { error: "Belum login." },
      { status: 401 }
    );
  }

  /*
   * SUPERADMIN tidak wajib memiliki RT.
   * SUPERADMIN memang digunakan untuk mengelola banyak RT.
   */
  if (
    !hasRole(session, ["SUPERADMIN"]) &&
    !session.rTUnitId
  ) {
    return NextResponse.json(
      { error: "Akun belum memiliki RT." },
      { status: 403 }
    );
  }

  if (!hasRole(session, roles)) {
    return NextResponse.json(
      {
        error:
          "Anda tidak memiliki hak akses untuk tindakan ini.",
      },
      { status: 403 }
    );
  }

  return null;
}

export function requireRtSession(
  session: SessionUser | null
) {
  if (!session) {
    return NextResponse.json(
      { error: "Belum login." },
      { status: 401 }
    );
  }

  /*
   * SUPERADMIN boleh masuk tanpa RT
   * karena dapat mengelola seluruh RT.
   */
  if (
    !hasRole(session, ["SUPERADMIN"]) &&
    !session.rTUnitId
  ) {
    return NextResponse.json(
      { error: "Akun belum memiliki RT." },
      { status: 403 }
    );
  }

  return null;
}