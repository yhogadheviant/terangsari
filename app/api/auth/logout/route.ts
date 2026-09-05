import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/app/lib/auth/session";
import { logActivity } from "@/app/lib/activity-log";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session) await logActivity({
      actorUserId:session.id, actorUsername:session.username, actorRole:session.role,
      action:"LOGOUT", module:"AUTH", description:"Logout.",
      rTUnitId:session.rTUnitId, request,
    });
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

