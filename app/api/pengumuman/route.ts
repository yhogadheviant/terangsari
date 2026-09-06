import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { logActivity } from "@/app/lib/activity-log";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/* =========================
   GET PENGUMUMAN
========================= */
export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "PENGUMUMAN_VIEW"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

    const data = await prisma.pengumuman.findMany({
      where: {
        rTUnitId,
      },
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

/* =========================
   POST PENGUMUMAN
========================= */
export async function POST(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "PENGUMUMAN_CREATE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

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
      return jsonError(
        "Tanggal tidak valid.",
        400
      );
    }

    const data = await prisma.pengumuman.create({
      data: {
        judul,
        isi,
        aktif,
        tanggal,
        rTUnitId,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "CREATE",
      module: "PENGUMUMAN",
      targetType: "Pengumuman",
      targetId: data.id,
      description: `Pengumuman "${data.judul}" berhasil dibuat.`,
      metadata: {
        judul: data.judul,
        isi: data.isi,
        aktif: data.aktif,
        tanggal: data.tanggal.toISOString(),
      },
      rTUnitId,
      request,
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

/* =========================
   PATCH PENGUMUMAN
========================= */
export async function PATCH(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "PENGUMUMAN_UPDATE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

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
        rTUnitId,
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
        return jsonError(
          "Tanggal tidak valid.",
          400
        );
      }

      data.tanggal = tanggal;
    }

    const updated = await prisma.pengumuman.update({
      where: {
        id,
      },
      data,
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "UPDATE",
      module: "PENGUMUMAN",
      targetType: "Pengumuman",
      targetId: updated.id,
      description: `Pengumuman "${updated.judul}" berhasil diperbarui.`,
      metadata: {
        sebelum: {
          judul: existing.judul,
          isi: existing.isi,
          aktif: existing.aktif,
          tanggal: existing.tanggal.toISOString(),
        },
        sesudah: {
          judul: updated.judul,
          isi: updated.isi,
          aktif: updated.aktif,
          tanggal: updated.tanggal.toISOString(),
        },
      },
      rTUnitId,
      request,
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

/* =========================
   DELETE PENGUMUMAN
========================= */
export async function DELETE(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const permissionResponse = await requirePermission(
      context.session,
      "PENGUMUMAN_DELETE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

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
        rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Pengumuman tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    await prisma.pengumuman.delete({
      where: {
        id,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "DELETE",
      module: "PENGUMUMAN",
      targetType: "Pengumuman",
      targetId: existing.id,
      description: `Pengumuman "${existing.judul}" berhasil dihapus.`,
      metadata: {
        judul: existing.judul,
        isi: existing.isi,
        aktif: existing.aktif,
        tanggal: existing.tanggal.toISOString(),
      },
      rTUnitId,
      request,
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
