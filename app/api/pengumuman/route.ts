import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
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

    const data = await prisma.pengumuman.findMany({
      where,
      orderBy: {
        tanggal: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET_PENGUMUMAN_ERROR:", error);

    return jsonError(
      "Gagal mengambil data pengumuman.",
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

    const judul = String(body.judul || "").trim();
    const isi = String(body.isi || "").trim();
    const aktif = body.aktif !== false;

    if (!judul) {
      return jsonError(
        "Judul pengumuman wajib diisi.",
        400
      );
    }

    if (!isi) {
      return jsonError(
        "Isi pengumuman wajib diisi.",
        400
      );
    }

    const tanggal = body.tanggal
      ? new Date(body.tanggal)
      : new Date();

    if (Number.isNaN(tanggal.getTime())) {
      return jsonError("Tanggal tidak valid.", 400);
    }

    const data = await prisma.pengumuman.create({
      data: {
        judul,
        isi,
        aktif,
        tanggal,
        rTUnitId: session.rTUnitId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil ditambahkan.",
      data,
    });
  } catch (error) {
    console.error("POST_PENGUMUMAN_ERROR:", error);

    return jsonError(
      "Gagal menambahkan pengumuman.",
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
    const id = String(body.id || "").trim();

    if (!id) {
      return jsonError(
        "ID pengumuman wajib diisi.",
        400
      );
    }

    const existing = await prisma.pengumuman.findFirst({
      where: {
        id,
        rTUnitId: session.rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Pengumuman tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    const data: {
      judul?: string;
      isi?: string;
      aktif?: boolean;
      tanggal?: Date;
    } = {};

    if (body.judul !== undefined) {
      data.judul = String(body.judul).trim();
    }

    if (body.isi !== undefined) {
      data.isi = String(body.isi).trim();
    }

    if (body.aktif !== undefined) {
      data.aktif = Boolean(body.aktif);
    }

    if (body.tanggal !== undefined) {
      const tanggal = new Date(body.tanggal);

      if (Number.isNaN(tanggal.getTime())) {
        return jsonError("Tanggal tidak valid.", 400);
      }

      data.tanggal = tanggal;
    }

    const updated = await prisma.pengumuman.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH_PENGUMUMAN_ERROR:", error);

    return jsonError(
      "Gagal memperbarui pengumuman.",
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
    const id = url.searchParams.get("id");

    if (!id) {
      return jsonError(
        "ID pengumuman wajib diisi.",
        400
      );
    }

    const existing = await prisma.pengumuman.findFirst({
      where: {
        id,
        rTUnitId: session.rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Pengumuman tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    await prisma.pengumuman.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE_PENGUMUMAN_ERROR:", error);

    return jsonError(
      "Gagal menghapus pengumuman.",
      500
    );
  }
}

