import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

function getPeriodRange(periode: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);

  if (!match) {
    throw new Error("Format periode harus YYYY-MM.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new Error("Bulan tidak valid.");
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end };
}

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
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
      "LAPORAN_VIEW"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId!;
    const url = new URL(request.url);

    const periode =
      url.searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const { start, end } = getPeriodRange(periode);

    /* ==========================================
       DATA WARGA
    ========================================== */

    const [
      totalKK,
      totalWarga,
      lakiLaki,
      perempuan,
      balita,
      anak5_9,
      anak10_14,
      remaja15_19,
      dewasa20_59,
      lansia,
      tetap,
      sewa,
      kontrak,
      menumpang,
      statusLainnya,
    ] = await Promise.all([
      prisma.kK.count({
        where: {
          rTUnitId: rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          jenisKelamin: "LAKI_LAKI",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          jenisKelamin: "PEREMPUAN",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 0,
            lte: 4,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 5,
            lte: 9,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 10,
            lte: 14,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 15,
            lte: 19,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 20,
            lte: 59,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 60,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "TETAP",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "SEWA",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "KONTRAK",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "MENUMPANG",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "LAINNYA",
        },
      }),
    ]);

    /* ==========================================
       IURAN
    ========================================== */

    const iuran = await prisma.iuran.findMany({
      where: {
        rTUnitId: rTUnitId,
        periode,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        paidAt: true,
        kkId: true,
      },
    });

    const iuranLunas = iuran.filter(
      (x) => x.status === "LUNAS"
    );

    const iuranBelumBayar = iuran.filter(
      (x) => x.status !== "LUNAS"
    );

    const totalIuran = iuranLunas.reduce(
      (sum, x) => sum + x.amount,
      0
    );

    const tagihanIuran = iuran.reduce(
      (sum, x) => sum + x.amount,
      0
    );

    /* ==========================================
       METODE IURAN
    ========================================== */

    const cash = iuranLunas
      .filter((x) => x.method === "CASH")
      .reduce((sum, x) => sum + x.amount, 0);

    const transfer = iuranLunas
      .filter((x) => x.method === "TRANSFER")
      .reduce((sum, x) => sum + x.amount, 0);

    const qris = iuranLunas
      .filter((x) => x.method === "QRIS")
      .reduce((sum, x) => sum + x.amount, 0);

    const lainnya = iuranLunas
      .filter(
        (x) =>
          x.method &&
          !["CASH", "TRANSFER", "QRIS"].includes(x.method)
      )
      .reduce((sum, x) => sum + x.amount, 0);

    /* ==========================================
       DANA TAKTIS
    ========================================== */

    const tactical =
      await prisma.tacticalFundTransaction.findMany({
        where: {
          rTUnitId: rTUnitId,
          date: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

    const danaMasuk = tactical
      .filter((x) => x.type === "MASUK")
      .reduce((sum, x) => sum + x.amount, 0);

    const danaKeluar = tactical
      .filter((x) => x.type === "KELUAR")
      .reduce((sum, x) => sum + x.amount, 0);

    const saldoTaktis = danaMasuk - danaKeluar;

    /* ==========================================
       RESPONSE
    ========================================== */

    return NextResponse.json({
      success: true,

      periode,

      warga: {
        totalKK,
        totalWarga,

        jenisKelamin: {
          lakiLaki,
          perempuan,
        },

        kelompokUsia: {
          balita,
          anak5_9,
          anak10_14,
          remaja15_19,
          dewasa20_59,
          lansia,
        },

        statusTinggal: {
          tetap,
          sewa,
          kontrak,
          menumpang,
          statusLainnya,
        },
      },

      iuran: {
        totalKKWajib: iuran.length,
        lunas: iuranLunas.length,
        belumBayar: iuranBelumBayar.length,

        tagihan: tagihanIuran,
        penerimaan: totalIuran,

        metode: {
          cash,
          transfer,
          qris,
          lainnya,
        },
      },

      danaTaktis: {
        masuk: danaMasuk,
        keluar: danaKeluar,
        saldo: saldoTaktis,
        daftar: tactical,
      },
    });
  } catch (error) {
    console.error("LAPORAN_API_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan.",
      },
      {
        status: 500,
      }
    );
  }
}
