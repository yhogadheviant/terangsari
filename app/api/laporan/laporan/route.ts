import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

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
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

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
      anak,
      dewasa,
      lansia,
      tetap,
      sewa,
      kontrak,
      menumpang,
      statusLainnya,
    ] = await Promise.all([
      prisma.kK.count({
        where: {
          rTUnitId: session.rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          jenisKelamin: "LAKI_LAKI",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          jenisKelamin: "PEREMPUAN",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          usia: {
            lt: 17,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          usia: {
            gte: 17,
            lt: 60,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          usia: {
            gte: 60,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          statusTinggal: "TETAP",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          statusTinggal: "SEWA",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          statusTinggal: "KONTRAK",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          statusTinggal: "MENUMPANG",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: session.rTUnitId,
          statusTinggal: "LAINNYA",
        },
      }),
    ]);

    /* ==========================================
       IURAN
    ========================================== */

    const iuran = await prisma.iuran.findMany({
      where: {
        rTUnitId: session.rTUnitId,
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
          rTUnitId: session.rTUnitId,
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
          anak,
          dewasa,
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
        transaksi: tactical,
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
