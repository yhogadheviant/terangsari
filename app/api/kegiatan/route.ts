import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

function clean(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function parseDate(value: unknown) {
  const text = clean(value);

  if (!text) return null;

  const date = new Date(`${text}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  try {
    const session = await getSession();

    const where = session?.rTUnitId
      ? {
          rTUnitId: session.rTUnitId,
        }
      : {
          aktif: true,
        };

    const rows = await prisma.kegiatan.findMany({
      where,
      orderBy: [
        {
          tanggal: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      kegiatan: rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        tanggal: row.tanggal.toISOString(),
        jam: row.jam,
        lokasi: row.lokasi,
        keterangan: row.keterangan,
        aktif: row.aktif,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("KEGIATAN_GET_ERROR:", error);

    return jsonError(
      "Gagal mengambil data kegiatan.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const body = await request.json();

    const nama = clean(body.nama);
    const tanggal = parseDate(body.tanggal);

    if (!nama) {
      return jsonError(
        "Nama kegiatan wajib diisi.",
        400
      );
    }

    if (!tanggal) {
      return jsonError(
        "Tanggal kegiatan tidak valid.",
        400
      );
    }

    const row = await prisma.kegiatan.create({
      data: {
        nama,
        tanggal,
        jam: clean(body.jam) || null,
        lokasi: clean(body.lokasi) || null,
        keterangan: clean(body.keterangan) || null,
        aktif: body.aktif !== false,
        rTUnitId: session.rTUnitId,
      },
    });

    return NextResponse.json({
      success: true,
      kegiatan: row,
    });
  } catch (error) {
    console.error("KEGIATAN_POST_ERROR:", error);

    return jsonError(
      "Gagal menyimpan kegiatan.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const body = await request.json();

    const id = clean(body.id);
    const nama = clean(body.nama);
    const tanggal = parseDate(body.tanggal);

    if (!id) {
      return jsonError(
        "ID kegiatan tidak ada.",
        400
      );
    }

    if (!nama) {
      return jsonError(
        "Nama kegiatan wajib diisi.",
        400
      );
    }

    if (!tanggal) {
      return jsonError(
        "Tanggal kegiatan tidak valid.",
        400
      );
    }

    const existing = await prisma.kegiatan.findFirst({
      where: {
        id,
        rTUnitId: session.rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Kegiatan tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    const row = await prisma.kegiatan.update({
      where: {
        id,
      },
      data: {
        nama,
        tanggal,
        jam: clean(body.jam) || null,
        lokasi: clean(body.lokasi) || null,
        keterangan: clean(body.keterangan) || null,
        aktif: body.aktif !== false,
      },
    });

    return NextResponse.json({
      success: true,
      kegiatan: row,
    });
  } catch (error) {
    console.error("KEGIATAN_PATCH_ERROR:", error);

    return jsonError(
      "Gagal mengubah kegiatan.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const url = new URL(request.url);
    const id = clean(url.searchParams.get("id"));

    if (!id) {
      return jsonError(
        "ID kegiatan tidak ada.",
        400
      );
    }

    const existing = await prisma.kegiatan.findFirst({
      where: {
        id,
        rTUnitId: session.rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Kegiatan tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    await prisma.kegiatan.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("KEGIATAN_DELETE_ERROR:", error);

    return jsonError(
      "Gagal menghapus kegiatan.",
      500
    );
  }
}

