import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { logActivity } from "@/app/lib/activity-log";
import {
  getRoleDefaultPermissions,
  hasRole,
  isPermissionCode,
  type PermissionCode,
} from "@/app/lib/auth/authorization";

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

async function requireSuperadmin() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: errorResponse("Belum login.", 401),
    };
  }

  if (!hasRole(session, ["SUPERADMIN"])) {
    return {
      session: null,
      response: errorResponse(
        "Akses hanya untuk SUPERADMIN.",
        403
      ),
    };
  }

  return {
    session,
    response: null,
  };
}

// =====================================================
// GET
// /api/superadmin/users/permissions?userId=xxx
// =====================================================

export async function GET(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const userId = text(
      new URL(request.url).searchParams.get("userId")
    );

    if (!userId) {
      return errorResponse(
        "userId wajib diisi.",
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        wargaId: true,
        rTUnitId: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse(
        "Akun tidak ditemukan.",
        404
      );
    }

    if (user.role === "SUPERADMIN") {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            wargaId: user.wargaId,
            rTUnitId: user.rTUnitId,
          },
          superadmin: true,
          permissions: [],
        },
      });
    }

    const rolePermissionSet =
      new Set<PermissionCode>(
        getRoleDefaultPermissions(
          user.role as Parameters<typeof getRoleDefaultPermissions>[0]
        )
      );

    const overrides = new Map(
      user.permissions.map((item) => [
        item.permission.code,
        item.allowed,
      ])
    );

    const allPermissions =
      await prisma.permission.findMany({
        where: {
          active: true,
        },
        orderBy: [
          {
            category: "asc",
          },
          {
            code: "asc",
          },
        ],
      });

    const permissions =
      allPermissions.map((permission) => {
        const hasOverride =
          overrides.has(permission.code);

        const overrideValue =
          hasOverride
            ? overrides.get(permission.code)!
            : null;

        const defaultAllowed =
          rolePermissionSet.has(
            permission.code as PermissionCode
          );

        const effectiveAllowed =
          hasOverride
            ? Boolean(overrideValue)
            : defaultAllowed;

        return {
          id: permission.id,
          code: permission.code,
          name: permission.name,
          description: permission.description,
          category: permission.category,
          defaultAllowed,
          overrideAllowed: hasOverride ? Boolean(overrideValue) : null,
          effectiveAllowed,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          wargaId: user.wargaId,
          rTUnitId: user.rTUnitId,
        },
        superadmin: false,
        permissions,
      },
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_USER_PERMISSIONS_GET_ERROR:",
      error
    );

    return errorResponse(
      "Gagal mengambil permission akun.",
      500
    );
  }
}

// =====================================================
// PATCH
// =====================================================

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const userId = text(body.userId);
    const permissionCode =
      text(body.permissionCode).toUpperCase();

    if (!isPermissionCode(permissionCode)) {
      return errorResponse(
        "Permission tidak valid.",
        400
      );
    }

    if (!userId) {
      return errorResponse(
        "userId wajib diisi.",
        400
      );
    }

    if (!permissionCode) {
      return errorResponse(
        "permissionCode wajib diisi.",
        400
      );
    }

    if (
      body.allowed !== true &&
      body.allowed !== false &&
      body.allowed !== null
    ) {
      return errorResponse(
        "allowed harus true, false, atau null.",
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        rTUnitId: true,
      },
    });

    if (!user) {
      return errorResponse(
        "Akun tidak ditemukan.",
        404
      );
    }

    if (user.role === "SUPERADMIN") {
      return errorResponse(
        "Permission akun SUPERADMIN tidak dapat diubah.",
        403
      );
    }

    const permission =
      await prisma.permission.findUnique({
        where: {
          code: permissionCode,
        },
      });

    if (!permission) {
      return errorResponse(
        "Permission tidak ditemukan.",
        404
      );
    }

    if (!permission.active) {
      return errorResponse(
        "Permission sedang nonaktif.",
        400
      );
    }

    if (body.allowed === null) {
      await prisma.userPermission.deleteMany({
        where: {
          userId,
          permissionId: permission.id,
        },
      });

      await logActivity({
        actorUserId: auth.session?.id,
        actorUsername: auth.session?.username,
        actorRole: auth.session?.role,
        action: "DELETE",
        description: `Menghapus override permission ${permissionCode} dari akun ${user.username}`,
        module: "SUPERADMIN_USER_PERMISSIONS",
        rTUnitId: user.rTUnitId ?? undefined,
        metadata: {
          userId: user.id,
          username: user.username,
          permissionId: permission.id,
          permissionCode,
          allowed: null,
        },
      });
      return NextResponse.json({
        success: true,
        message:
          "Override permission dihapus. Akun kembali mengikuti role default.",
        data: {
          userId,
          permissionCode,
          overrideAllowed: null,
        },
      });
    }

    const row =
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id,
          },
        },
        update: {
          allowed: body.allowed,
        },
        create: {
          userId,
          permissionId: permission.id,
          allowed: body.allowed,
        },
      });

    await logActivity({
      actorUserId: auth.session?.id,
      actorUsername: auth.session?.username,
      actorRole: auth.session?.role,
      action: "UPDATE",
      description: `${body.allowed === true ? "Mengaktifkan" : "Menonaktifkan"} permission ${permissionCode} untuk akun ${user.username}`,
      module: "SUPERADMIN_USER_PERMISSIONS",
      rTUnitId: user.rTUnitId ?? undefined,
      metadata: {
        userId: user.id,
        username: user.username,
        permissionId: permission.id,
        permissionCode,
        allowed: body.allowed,
      },
    });
    return NextResponse.json({
      success: true,
      message:
        body.allowed === true
          ? "Permission berhasil diaktifkan untuk akun ini."
          : "Permission berhasil dinonaktifkan untuk akun ini.",
      data: {
        id: row.id,
        userId: row.userId,
        permissionId: row.permissionId,
        permissionCode,
        allowed: row.allowed,
      },
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_USER_PERMISSIONS_PATCH_ERROR:",
      error
    );

    return errorResponse(
      "Gagal menyimpan permission akun.",
      500
    );
  }
}


