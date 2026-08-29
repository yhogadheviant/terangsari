import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";

const KEY = "app_name";

async function requireSuperadmin() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: "Belum login.",
      },
      { status: 401 }
    );
  }

  if (!hasRole(session, ["SUPERADMIN"])) {
    return NextResponse.json(
      {
        success: false,
        error: "Akses hanya untuk SUPERADMIN.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function GET() {
  try {
    const denied = await requireSuperadmin();

    if (denied) return denied;

    const setting =
      await prisma.appSetting.findUnique({
        where: { key: KEY },
      });

    return NextResponse.json({
      success: true,
      data: {
        appName:
          setting?.value?.trim() ||
          "Smart Warga",
      },
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_SETTINGS_GET_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal mengambil pengaturan aplikasi.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const denied = await requireSuperadmin();

    if (denied) return denied;

    const body = await request.json();

    const appName = String(
      body.appName ?? ""
    ).trim();

    if (!appName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama aplikasi wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (appName.length > 80) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama aplikasi maksimal 80 karakter.",
        },
        { status: 400 }
      );
    }

    const setting =
      await prisma.appSetting.upsert({
        where: {
          key: KEY,
        },
        update: {
          value: appName,
        },
        create: {
          id: crypto.randomUUID(),
          key: KEY,
          value: appName,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Nama aplikasi berhasil diperbarui.",
      data: {
        appName: setting.value,
      },
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_SETTINGS_PATCH_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal menyimpan pengaturan aplikasi.",
      },
      { status: 500 }
    );
  }
}
