import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

function clean(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "PENGATURAN_VIEW"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

    const [rt, account] = await Promise.all([
      prisma.rTUnit.findUnique({
        where: {
          id: rTUnitId,
        },
        select: {
          id: true,
          kodeRT: true,
          kodeRW: true,
          namaRT: true,
          perumahan: true,
          desa: true,
          kecamatan: true,
          kabupaten: true,
          aktif: true,
        },
      }),

      prisma.user.findUnique({
        where: {
          id: context.session.id,
        },
        select: {
          username: true,
          role: true,
        },
      }),
    ]);

    if (!rt) {
      return errorResponse("Data RT tidak ditemukan.", 404);
    }

    return NextResponse.json({
      success: true,
      rt,
      account,
    });
  } catch (error) {
    console.error("PENGATURAN_GET_ERROR:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Gagal mengambil pengaturan.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "PENGATURAN_UPDATE"
    );

    if (permissionResponse) return permissionResponse;

    const rTUnitId = context.rTUnitId!;

    const body = await request.json();

    const kodeRT = clean(body.kodeRT);
    const kodeRW = clean(body.kodeRW);
    const namaRT = clean(body.namaRT);

    if (!kodeRT || !kodeRW || !namaRT) {
      return errorResponse(
        "Nomor RT, nomor RW, dan nama RT wajib diisi.",
        400
      );
    }

    const existing = await prisma.rTUnit.findUnique({
      where: {
        id: rTUnitId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return errorResponse("Data RT tidak ditemukan.", 404);
    }

    const duplicate = await prisma.rTUnit.findFirst({
      where: {
        kodeRT,
        kodeRW,
        NOT: {
          id: rTUnitId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return errorResponse(
        "Kombinasi RT/RW tersebut sudah digunakan RT lain.",
        409
      );
    }

    const rt = await prisma.rTUnit.update({
      where: {
        id: rTUnitId,
      },
      data: {
        kodeRT,
        kodeRW,
        namaRT,
        perumahan: clean(body.perumahan) || null,
        desa: clean(body.desa) || null,
        kecamatan: clean(body.kecamatan) || null,
        kabupaten: clean(body.kabupaten) || null,
      },
      select: {
        id: true,
        kodeRT: true,
        kodeRW: true,
        namaRT: true,
        perumahan: true,
        desa: true,
        kecamatan: true,
        kabupaten: true,
        aktif: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan RT berhasil disimpan.",
      rt,
    });
  } catch (error: any) {
    console.error("PENGATURAN_PATCH_ERROR:", error);

    if (error?.code === "P2002") {
      return errorResponse(
        "Kombinasi RT/RW tersebut sudah digunakan.",
        409
      );
    }

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan pengaturan.",
      500
    );
  }
}
