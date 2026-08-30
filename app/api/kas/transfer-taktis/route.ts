import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

function clean(v: unknown) {
  return v == null ? "" : String(v).trim();
}

function amountNumber(v: unknown) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const rows = await prisma.kasTransaction.findMany({
      where: {
        rTUnitId: session.rTUnitId,
        category: "PENGELUARAN_KE_DANA_TAKTIS",
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      rows.map((x) => ({
        id: x.id,
        amount: x.amount,
        description: x.description,
        date: x.date.toISOString(),
      }))
    );
  } catch (e) {
    console.error("PENGELUARAN_DANA_TAKTIS_GET_ERROR", e);

    return NextResponse.json(
      {
        error: "Gagal membaca histori pengeluaran ke Dana Taktis.",
        detail: String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const body = await req.json();
    const amount = amountNumber(body.amount);
    const description = clean(body.description);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError(
        "Nominal pengeluaran harus lebih dari 0.",
        400
      );
    }

    const date = body.date
      ? new Date(`${clean(body.date)}T00:00:00`)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return jsonError("Tanggal tidak valid.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const masuk = await tx.kasTransaction.aggregate({
        _sum: { amount: true },
        where: {
          rTUnitId: session.rTUnitId,
          type: "PEMASUKAN",
        },
      });

      const keluar = await tx.kasTransaction.aggregate({
        _sum: { amount: true },
        where: {
          rTUnitId: session.rTUnitId,
          type: "PENGELUARAN",
        },
      });

      const saldoKas =
        Number(masuk._sum.amount ?? 0) -
        Number(keluar._sum.amount ?? 0);

      if (amount > saldoKas) {
        throw new Error(
          `Saldo Kas RT tidak mencukupi. Saldo saat ini Rp ${saldoKas.toLocaleString(
            "id-ID"
          )}.`
        );
      }

      const kasOut = await tx.kasTransaction.create({
        data: {
          type: "PENGELUARAN",
          amount,
          category: "PENGELUARAN_KE_DANA_TAKTIS",
          description:
            description ||
            "Pengeluaran Kas RT untuk Dana Taktis",
          date,
          rTUnitId: session.rTUnitId,
        },
      });

      const tacticalIn =
        await tx.tacticalFundTransaction.create({
          data: {
            type: "MASUK",
            amount,
            category: "PENGELUARAN_DARI_KAS_RT",
            description:
              description ||
              "Dana Taktis dari pengeluaran Kas RT",
            date,
            rTUnitId: session.rTUnitId,
          },
        });

      return { kasOut, tacticalIn };
    });

    return NextResponse.json({
      ok: true,
      message: `Pengeluaran ${amount.toLocaleString(
        "id-ID"
      )} berhasil.`,
      result: {
        kasTransactionId: result.kasOut.id,
        tacticalTransactionId: result.tacticalIn.id,
      },
    });
  } catch (e: any) {
    console.error("PENGELUARAN_DANA_TAKTIS_POST_ERROR", e);

    return NextResponse.json(
      {
        error:
          e?.message ||
          "Pengeluaran Kas RT ke Dana Taktis gagal.",
      },
      { status: 400 }
    );
  }
}


