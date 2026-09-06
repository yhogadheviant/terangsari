import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";
import { logActivity } from "@/app/lib/activity-log";

const NAME_KEY = "app_name";
const LOGO_KEY = "app_logo";

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

    const [nameSetting, logoSetting] = await Promise.all([
      prisma.appSetting.findUnique({
        where: { key: NAME_KEY },
      }),
      prisma.appSetting.findUnique({
        where: { key: LOGO_KEY },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        appName:
          nameSetting?.value?.trim() ||
          "Smart Warga",
        appLogo:
          logoSetting?.value?.trim() ||
          "",
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

    const appLogo = String(
      body.appLogo ?? ""
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

    if (appLogo.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "URL logo maksimal 500 karakter.",
        },
        { status: 400 }
      );
    }

    if (
      appLogo &&
      !/^https?:\/\/[^\s]+$/i.test(appLogo)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "URL logo harus menggunakan http:// atau https://.",
        },
        { status: 400 }
      );
    }

    const setting =
      await prisma.appSetting.upsert({
        where: {
          key: NAME_KEY,
        },
        update: {
          value: appName,
        },
        create: {
          id: crypto.randomUUID(),
          key: NAME_KEY,
          value: appName,
          updatedAt: new Date(),
        },
      });

    const logoSetting =
      await prisma.appSetting.upsert({
        where: {
          key: LOGO_KEY,
        },
        update: {
          value: appLogo || null,
        },
        create: {
          id: crypto.randomUUID(),
          key: LOGO_KEY,
          value: appLogo || null,
          updatedAt: new Date(),
        },
      });

    const session = await getSession();

    await logActivity({
      actorUserId: session?.id,
      actorUsername: session?.username,
      actorRole: session?.role,
      action: "UPDATE",
      description:
        `Mengubah identitas portal menjadi ${setting.value}`,
      module: "SUPERADMIN_SETTINGS",
      metadata: {
        nameKey: NAME_KEY,
        logoKey: LOGO_KEY,
        appName: setting.value,
        appLogo: logoSetting.value || "",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Pengaturan identitas portal berhasil diperbarui.",
      data: {
        appName: setting.value,
        appLogo: logoSetting.value || "",
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
