import { NextResponse } from "next/server";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { prisma } from "@/app/lib/prisma";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "IURAN_VIEW"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId;

    if (!rTUnitId) {
      return jsonError("RT aktif tidak ditemukan.", 400);
    }
    const periode =
      new URL(request.url).searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const [totalKK, iuran, qris] = await Promise.all([
      prisma.kK.count({
        where: {
          rTUnitId: rTUnitId,
        },
      }),

      prisma.iuran.findMany({
        where: {
          rTUnitId: rTUnitId,
          periode,
        },
        include: {
          kk: {
            select: {
              nomorKK: true,
              kepalaKeluarga: true,
              alamat: true,
            },
          },
        },
        orderBy: {
          kk: {
            kepalaKeluarga: "asc",
          },
        },
      }),

      prisma.qRISConfig.findFirst({
        where: {
          rTUnitId: rTUnitId,
        },
      }),
    ]);

    const lunas = iuran.filter(
      (x) => x.status === "LUNAS"
    );

    const totalTagihan = totalKK * 40000;

    const totalDiterima = lunas.reduce(
      (s, x) => s + x.amount,
      0
    );

    return NextResponse.json({
      periode,
      totalKK,
      sudahBayar: lunas.length,
      belumBayar: Math.max(
        totalKK - lunas.length,
        0
      ),
      totalTagihan,
      totalDiterima,
      sisaTagihan: Math.max(
        totalTagihan - totalDiterima,
        0
      ),

      transaksi: iuran.map((x) => ({
        id: x.id,
        nomorKK: x.kk.nomorKK,
        kepalaKeluarga: x.kk.kepalaKeluarga,
        alamat: x.kk.alamat,
        amount: x.amount,
        status: x.status,
        method: x.method,
        paidAt: x.paidAt,
        note: x.note,
      })),

      qris:
        qris || {
          merchantName: "",
          qrisName: "",
          qrisString: "",
          imageUrl: "",
          active: true,
        },
    });
  } catch (e) {
    console.error("REKAP_IURAN_ERROR", e);

    return NextResponse.json(
      {
        error: "Gagal mengambil rekap iuran.",
      },
      {
        status: 500,
      }
    );
  }
}



