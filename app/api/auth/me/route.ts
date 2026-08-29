import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    let rtUnit = null;

    if (session.rTUnitId) {
      rtUnit = await prisma.rTUnit.findUnique({
        where: {
          id: session.rTUnitId,
        },
        select: {
          id: true,
          kodeRT: true,
          kodeRW: true,
          namaRT: true,
          perumahan: true,
          desa: true,
          kecamatan: true,
          kabupaten: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: session.id,
        username: session.username,
        role: session.role,
        wargaId: session.wargaId,
        rTUnitId: session.rTUnitId,
        rtUnit,
      },
    });
  } catch (error) {
    console.error("AUTH_ME_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
      },
      { status: 500 }
    );
  }
}
