import { NextResponse } from "next/server";
import { clearSession } from "@/app/lib/auth/session";

export async function POST() {
  try {
    await clearSession();

    return NextResponse.json({
      success: true,
      message: "Logout berhasil.",
    });
  } catch (error) {
    console.error("LOGOUT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal logout.",
      },
      { status: 500 }
    );
  }
}