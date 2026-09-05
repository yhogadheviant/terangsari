import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

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
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/* =========================
   GET KEGIATAN
========================= */
export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "KEGIATAN_VIEW"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

    const rows = await prisma.kegiatan.findMany({
      where: {
        rTUnitId,
      },
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

/* =========================
   POST KEGIATAN
========================= */
export async function POST(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "KEGIATAN_CREATE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

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
        rTUnitId,
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

/* =========================
   PATCH KEGIATAN
========================= */
export async function PATCH(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "KEGIATAN_UPDATE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

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

    const existing =
      await prisma.kegiatan.findFirst({
        where: {
          id,
          rTUnitId,
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
      "Gagal memperbarui kegiatan.",
      500
    );
  }
}

/* =========================
   DELETE KEGIATAN
========================= */
export async function DELETE(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "KEGIATAN_DELETE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

    const url = new URL(request.url);
    const id = clean(
      url.searchParams.get("id")
    );

    if (!id) {
      return jsonError(
        "ID kegiatan wajib diisi.",
        400
      );
    }

    const existing =
      await prisma.kegiatan.findFirst({
        where: {
          id,
          rTUnitId,
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
      message: "Kegiatan berhasil dihapus.",
    });
  } catch (error) {
    console.error("KEGIATAN_DELETE_ERROR:", error);

    return jsonError(
      "Gagal menghapus kegiatan.",
      500
    );
  }
}
