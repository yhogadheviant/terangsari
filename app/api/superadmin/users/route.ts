import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = [
  "KETUA",
  "SEKRETARIS",
  "BENDAHARA",
  "WARGA",
] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

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

function normalizeRole(value: unknown): AllowedRole | null {
  const role = text(value).toUpperCase();

  if (
    role === "KETUA" ||
    role === "SEKRETARIS" ||
    role === "BENDAHARA" ||
    role === "WARGA"
  ) {
    return role;
  }

  return null;
}

// =====================================================
// GET - DAFTAR AKUN
// =====================================================

export async function GET() {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const rows = await prisma.user.findMany({
      where: {
        role: {
          in: [...ALLOWED_ROLES],
        },
      },
      orderBy: {
        username: "asc",
      },
      include: {
        rTUnit: true,
        warga: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        wargaId: row.wargaId,
        rTUnitId: row.rTUnitId,
        warga: row.warga
          ? {
              id: row.warga.id,
              nik: row.warga.nik,
              nama: row.warga.nama,
            }
          : null,
        rtUnit: row.rTUnit
          ? {
              id: row.rTUnit.id,
              kodeRT: row.rTUnit.kodeRT,
              kodeRW: row.rTUnit.kodeRW,
              namaRT: row.rTUnit.namaRT,
              aktif: row.rTUnit.aktif,
            }
          : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_USERS_GET_ERROR:",
      error
    );

    return errorResponse(
      "Gagal mengambil daftar akun.",
      500
    );
  }
}

// =====================================================
// POST - BUAT AKUN
// =====================================================

export async function POST(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const username = text(body.username).toLowerCase();
    const password = text(body.password);
    const role = normalizeRole(body.role);
    const rTUnitId = text(body.rTUnitId);

    if (!username) {
      return errorResponse(
        "Username wajib diisi.",
        400
      );
    }

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      return errorResponse(
        "Username minimal 3 karakter dan hanya boleh menggunakan huruf kecil, angka, titik, garis bawah, atau tanda minus.",
        400
      );
    }

    if (!password || password.length < 6) {
      return errorResponse(
        "Password minimal 6 karakter.",
        400
      );
    }

    if (!role) {
      return errorResponse(
        "Role tidak valid.",
        400
      );
    }

    if (!rTUnitId) {
      return errorResponse(
        "RT wajib dipilih.",
        400
      );
    }

    const rtUnit = await prisma.rTUnit.findUnique({
      where: {
        id: rTUnitId,
      },
    });

    if (!rtUnit) {
      return errorResponse(
        "RT tidak ditemukan.",
        404
      );
    }

    if (!rtUnit.aktif) {
      return errorResponse(
        "RT sedang nonaktif.",
        400
      );
    }

    const existing = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existing) {
      return errorResponse(
        "Username sudah digunakan.",
        409
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const row = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        rTUnitId,
      },
      include: {
        rTUnit: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Akun berhasil dibuat.",
        data: {
          id: row.id,
          username: row.username,
          role: row.role,
          rTUnitId: row.rTUnitId,
          rtUnit: row.rTUnit
            ? {
                id: row.rTUnit.id,
                kodeRT: row.rTUnit.kodeRT,
                kodeRW: row.rTUnit.kodeRW,
                namaRT: row.rTUnit.namaRT,
              }
            : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "SUPERADMIN_USERS_POST_ERROR:",
      error
    );

    return errorResponse(
      "Gagal membuat akun.",
      500
    );
  }
}

// =====================================================
// PATCH - UBAH AKUN
// =====================================================

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const id = text(body.id);

    if (!id) {
      return errorResponse(
        "ID akun wajib diisi.",
        400
      );
    }

    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        rTUnit: true,
      },
    });

    if (!existing) {
      return errorResponse(
        "Akun tidak ditemukan.",
        404
      );
    }

    // Jangan izinkan mengubah akun SUPERADMIN
    if (existing.role === "SUPERADMIN") {
      return errorResponse(
        "Akun SUPERADMIN tidak dapat diubah melalui menu ini.",
        403
      );
    }

    const data: {
      username?: string;
      passwordHash?: string;
      role?: AllowedRole;
      rTUnitId?: string;
    } = {};

    if (body.username !== undefined) {
      const username = text(body.username).toLowerCase();

      if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
        return errorResponse(
          "Format username tidak valid.",
          400
        );
      }

      const duplicate =
        await prisma.user.findFirst({
          where: {
            username,
            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        return errorResponse(
          "Username sudah digunakan.",
          409
        );
      }

      data.username = username;
    }

    if (body.password !== undefined) {
      const password = text(body.password);

      if (password && password.length < 6) {
        return errorResponse(
          "Password minimal 6 karakter.",
          400
        );
      }

      if (password) {
        data.passwordHash =
          await bcrypt.hash(password, 12);
      }
    }

    if (body.role !== undefined) {
      const role = normalizeRole(body.role);

      if (!role) {
        return errorResponse(
          "Role tidak valid.",
          400
        );
      }

      data.role = role;
    }

    if (body.rTUnitId !== undefined) {
      const rTUnitId = text(body.rTUnitId);

      if (!rTUnitId) {
        return errorResponse(
          "RT wajib dipilih.",
          400
        );
      }

      const rtUnit =
        await prisma.rTUnit.findUnique({
          where: {
            id: rTUnitId,
          },
        });

      if (!rtUnit) {
        return errorResponse(
          "RT tidak ditemukan.",
          404
        );
      }

      if (!rtUnit.aktif) {
        return errorResponse(
          "RT sedang nonaktif.",
          400
        );
      }

      data.rTUnitId = rTUnitId;
    }

    const row = await prisma.user.update({
      where: {
        id,
      },
      data,
      include: {
        rTUnit: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Akun berhasil diperbarui.",
      data: {
        id: row.id,
        username: row.username,
        role: row.role,
        rTUnitId: row.rTUnitId,
        rtUnit: row.rTUnit
          ? {
              id: row.rTUnit.id,
              kodeRT: row.rTUnit.kodeRT,
              kodeRW: row.rTUnit.kodeRW,
              namaRT: row.rTUnit.namaRT,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_USERS_PATCH_ERROR:",
      error
    );

    return errorResponse(
      "Gagal memperbarui akun.",
      500
    );
  }
}

// =====================================================
// DELETE - HAPUS AKUN
// =====================================================

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const id = text(
      new URL(request.url).searchParams.get("id")
    );

    if (!id) {
      return errorResponse(
        "ID akun wajib diisi.",
        400
      );
    }

    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return errorResponse(
        "Akun tidak ditemukan.",
        404
      );
    }

    if (existing.role === "SUPERADMIN") {
      return errorResponse(
        "Akun SUPERADMIN tidak dapat dihapus melalui menu ini.",
        403
      );
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Akun berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_USERS_DELETE_ERROR:",
      error
    );

    return errorResponse(
      "Gagal menghapus akun.",
      500
    );
  }
}

