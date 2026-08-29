import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { setSession } from "@/app/lib/auth/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username ?? "")
      .trim()
      .toLowerCase();

    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        warga: true,
        rTUnit: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau password salah.",
        },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau password salah.",
        },
        { status: 401 }
      );
    }

    await setSession({
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(),
      wargaId: user.wargaId,
      rTUnitId: user.rTUnitId,
    });

    return NextResponse.json({
      success: true,
redirect:
  user.role === "SUPERADMIN"
    ? "/panel/superadmin"
    : "/panel",
      user: {
        id: user.id,
        username: user.username,
        role: user.role.toLowerCase(),
        wargaId: user.wargaId,
        rTUnitId: user.rTUnitId,
        rtUnit: user.rTUnit
          ? {
              id: user.rTUnit.id,
              kodeRT: user.rTUnit.kodeRT,
              kodeRW: user.rTUnit.kodeRW,
              namaRT: user.rTUnit.namaRT,
              perumahan: user.rTUnit.perumahan,
              desa: user.rTUnit.desa,
              kecamatan: user.rTUnit.kecamatan,
              kabupaten: user.rTUnit.kabupaten,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
