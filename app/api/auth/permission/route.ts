import { NextResponse } from "next/server";
import {
  hasPermission,
  isPermissionCode,
  type PermissionCode,
} from "@/app/lib/auth/authorization";
import { getSession } from "@/app/lib/auth/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { allowed: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const code = String(url.searchParams.get("code") || "")
      .trim()
      .toUpperCase();

    if (!isPermissionCode(code)) {
      return NextResponse.json(
        { allowed: false, error: "Permission tidak valid." },
        { status: 400 }
      );
    }

    const allowed = await hasPermission(
      session,
      code as PermissionCode
    );

    return NextResponse.json({
      allowed,
      permission: code,
    });
  } catch (error) {
    console.error("AUTH_PERMISSION_CHECK_ERROR:", error);

    return NextResponse.json(
      {
        allowed: false,
        error: "Gagal memeriksa permission.",
      },
      { status: 500 }
    );
  }
}
