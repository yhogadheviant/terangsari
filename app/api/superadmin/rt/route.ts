import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";

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
// GET - DAFTAR SEMUA RT
// =====================================================

export async function GET() {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const rows = await prisma.rTUnit.findMany({
      orderBy: [
        {
          kodeRW: "asc",
        },
        {
          kodeRT: "asc",
        },
      ],
      include: {
        _count: {
          select: {
            users: true,
            warga: true,
            kks: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        kodeRT: row.kodeRT,
        kodeRW: row.kodeRW,
        namaRT: row.namaRT,
        perumahan: row.perumahan,
        desa: row.desa,
        kecamatan: row.kecamatan,
        kabupaten: row.kabupaten,
        aktif: row.aktif,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        statistik: {
          users: row._count.users,
          warga: row._count.warga,
          kk: row._count.kks,
        },
      })),
    });
  } catch (error) {
    console.error("SUPERADMIN_RT_GET_ERROR:", error);

    return errorResponse(
      "Gagal mengambil daftar RT.",
      500
    );
  }
}

// =====================================================
// POST - TAMBAH RT
// =====================================================

export async function POST(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const kodeRT = String(body.kodeRT ?? "")
      .trim()
      .replace(/^RT[\s-]*/i, "");

    const kodeRW = String(body.kodeRW ?? "")
      .trim()
      .replace(/^RW[\s-]*/i, "");

    const namaRT = String(body.namaRT ?? "").trim();

    const perumahan =
      String(body.perumahan ?? "").trim() || null;

    const desa =
      String(body.desa ?? "").trim() || null;

    const kecamatan =
      String(body.kecamatan ?? "").trim() || null;

    const kabupaten =
      String(body.kabupaten ?? "").trim() || null;

    if (!kodeRT) {
      return errorResponse(
        "Kode RT wajib diisi.",
        400
      );
    }

    if (!kodeRW) {
      return errorResponse(
        "Kode RW wajib diisi.",
        400
      );
    }

    if (!namaRT) {
      return errorResponse(
        "Nama RT wajib diisi.",
        400
      );
    }

    const existing = await prisma.rTUnit.findUnique({
      where: {
        kodeRT_kodeRW: {
          kodeRT,
          kodeRW,
        },
      },
    });

    if (existing) {
      return errorResponse(
        `RT ${kodeRT}/RW ${kodeRW} sudah terdaftar.`,
        409
      );
    }

    const row = await prisma.rTUnit.create({
      data: {
        kodeRT,
        kodeRW,
        namaRT,
        perumahan,
        desa,
        kecamatan,
        kabupaten,
        aktif:
          typeof body.aktif === "boolean"
            ? body.aktif
            : true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "RT berhasil ditambahkan.",
        data: row,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SUPERADMIN_RT_POST_ERROR:", error);

    return errorResponse(
      "Gagal menambahkan RT.",
      500
    );
  }
}

// =====================================================
// PATCH - EDIT / AKTIF NONAKTIF RT
// =====================================================

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperadmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const id = String(body.id ?? "").trim();

    if (!id) {
      return errorResponse(
        "ID RT wajib diisi.",
        400
      );
    }

    const existing = await prisma.rTUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse(
        "RT tidak ditemukan.",
        404
      );
    }

    const data: {
      kodeRT?: string;
      kodeRW?: string;
      namaRT?: string;
      perumahan?: string | null;
      desa?: string | null;
      kecamatan?: string | null;
      kabupaten?: string | null;
      aktif?: boolean;
    } = {};

    if (body.kodeRT !== undefined) {
      data.kodeRT = String(body.kodeRT)
        .trim()
        .replace(/^RT[\s-]*/i, "");
    }

    if (body.kodeRW !== undefined) {
      data.kodeRW = String(body.kodeRW)
        .trim()
        .replace(/^RW[\s-]*/i, "");
    }

    if (body.namaRT !== undefined) {
      data.namaRT = String(body.namaRT).trim();
    }

    if (body.perumahan !== undefined) {
      data.perumahan =
        String(body.perumahan).trim() || null;
    }

    if (body.desa !== undefined) {
      data.desa =
        String(body.desa).trim() || null;
    }

    if (body.kecamatan !== undefined) {
      data.kecamatan =
        String(body.kecamatan).trim() || null;
    }

    if (body.kabupaten !== undefined) {
      data.kabupaten =
        String(body.kabupaten).trim() || null;
    }

    if (body.aktif !== undefined) {
      data.aktif = Boolean(body.aktif);
    }

    if (
      data.kodeRT !== undefined ||
      data.kodeRW !== undefined
    ) {
      const kodeRT =
        data.kodeRT ?? existing.kodeRT;

      const kodeRW =
        data.kodeRW ?? existing.kodeRW;

      const duplicate =
        await prisma.rTUnit.findFirst({
          where: {
            kodeRT,
            kodeRW,
            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        return errorResponse(
          `RT ${kodeRT}/RW ${kodeRW} sudah terdaftar.`,
          409
        );
      }
    }

    const row = await prisma.rTUnit.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Data RT berhasil diperbarui.",
      data: row,
    });
  } catch (error) {
    console.error("SUPERADMIN_RT_PATCH_ERROR:", error);

    return errorResponse(
      "Gagal memperbarui data RT.",
      500
    );
  }
}

