import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getRTContext } from "@/app/lib/auth/rt-context";

function text(v: unknown) { return v == null ? "" : String(v).trim(); }
function amountNumber(v: unknown) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}
function periodKey(date: Date) { return date.toISOString().slice(0, 7); }
function getPeriodRange(periode: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!match) throw new Error("Format periode harus YYYY-MM.");
  const year = Number(match[1]), month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error("Bulan tidak valid.");
  return { year, month, start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}
function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;
    const permissionResponse = await requirePermission(context.session, "DANA_TAKTIS_VIEW");
    if (permissionResponse) return permissionResponse;
    const rTUnitId = context.rTUnitId!;
    const url = new URL(request.url);
    const periode = url.searchParams.get("periode") || "ALL";

    let start: Date | null = null;
    let end: Date | null = null;
    let year = 0;
    let month = 0;

    if (periode === "ALL") {
      // No date filter for ALL.
    } else if (/^\d{4}$/.test(periode)) {
      year = Number(periode);
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      const range = getPeriodRange(periode);
      ({ year, month, start, end } = range);
    }

    const where: any = { rTUnitId };
    if (start && end) where.date = { gte: start, lt: end };

    const rows = await prisma.tacticalFundTransaction.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const allRows = await prisma.tacticalFundTransaction.findMany({
      where: { rTUnitId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const sourceForRecap = periode === "ALL" ? allRows : allRows.filter((r) => end ? r.date < end : true);

    let totalIn = 0, totalOut = 0;
    for (const row of allRows) {
      if (row.type === "MASUK") totalIn += row.amount;
      else totalOut += row.amount;
    }

    let periodIn = 0, periodOut = 0;
    for (const row of rows) {
      if (row.type === "MASUK") periodIn += row.amount;
      else periodOut += row.amount;
    }

    const monthlyMap = new Map<string, { masuk: number; keluar: number }>();
    for (const row of sourceForRecap) {
      const key = periodKey(row.date);
      const current = monthlyMap.get(key) || { masuk: 0, keluar: 0 };
      if (row.type === "MASUK") current.masuk += row.amount;
      else current.keluar += row.amount;
      monthlyMap.set(key, current);
    }

    const keys = [...monthlyMap.keys()].sort();
    const rekapBulanan: any[] = [];
    let runningIn = 0, runningOut = 0;

    if (periode === "ALL") {
      for (const key of keys) {
        const current = monthlyMap.get(key)!;
        runningIn += current.masuk;
        runningOut += current.keluar;
        rekapBulanan.push({
          periode: key,
          masuk: current.masuk,
          keluar: current.keluar,
          masukKumulatif: runningIn,
          keluarKumulatif: runningOut,
          saldoKumulatif: runningIn - runningOut,
        });
      }
    } else if (keys.length && /^\d{4}-(\d{2})$/.test(periode)) {
      const first = keys[0];
      const [fy, fm] = first.split("-").map(Number);
      let cy = fy, cm = fm;
      while (cy < year || (cy === year && cm <= month)) {
        const key = `${cy}-${String(cm).padStart(2, "0")}`;
        const current = monthlyMap.get(key) || { masuk: 0, keluar: 0 };
        runningIn += current.masuk;
        runningOut += current.keluar;
        rekapBulanan.push({
          periode: key,
          masuk: current.masuk,
          keluar: current.keluar,
          masukKumulatif: runningIn,
          keluarKumulatif: runningOut,
          saldoKumulatif: runningIn - runningOut,
        });
        cm++;
        if (cm > 12) { cm = 1; cy++; }
      }
    }

    return NextResponse.json({
      success: true,
      periode,
      rows: rows.map((x) => ({
        id: x.id, type: x.type, amount: x.amount, category: x.category,
        description: x.description, date: x.date.toISOString(),
      })),
      summary: {
        masuk: totalIn,
        keluar: totalOut,
        saldo: totalIn - totalOut,
        masukPeriode: periodIn,
        keluarPeriode: periodOut,
        saldoPeriode: periodIn - periodOut,
      },
      rekapBulanan,
    });
  } catch (error) {
    console.error("DANA_TAKTIS_GET_ERROR", error);
    return jsonError(error instanceof Error ? error.message : "Gagal membaca Dana Taktis.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;
    const permissionResponse = await requirePermission(context.session, "DANA_TAKTIS_CREATE");
    if (permissionResponse) return permissionResponse;
    const rTUnitId = context.rTUnitId!;
    const body = await request.json();
    const type = text(body.type).toUpperCase();
    if (type !== "MASUK" && type !== "KELUAR") return jsonError("Jenis transaksi tidak valid.", 400);
    const amount = amountNumber(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return jsonError("Nominal harus lebih dari 0.", 400);
    const category = text(body.category);
    if (!category) return jsonError("Kategori wajib diisi.", 400);
    const date = body.date ? new Date(`${text(body.date)}T00:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) return jsonError("Tanggal tidak valid.", 400);

    if (type === "KELUAR") {
      const [incoming, outgoing] = await Promise.all([
        prisma.tacticalFundTransaction.aggregate({ _sum: { amount: true }, where: { rTUnitId, type: "MASUK" } }),
        prisma.tacticalFundTransaction.aggregate({ _sum: { amount: true }, where: { rTUnitId, type: "KELUAR" } }),
      ]);
      const balance = Number(incoming._sum.amount ?? 0) - Number(outgoing._sum.amount ?? 0);
      if (amount > balance) return NextResponse.json({ error: "Saldo Dana Taktis tidak mencukupi.", saldo: balance }, { status: 400 });
    }

    const row = await prisma.tacticalFundTransaction.create({
      data: {
        type: type as "MASUK" | "KELUAR",
        amount,
        category,
        description: text(body.description) || null,
        date,
        rTUnitId,
      },
    });
    return NextResponse.json({ success: true, ok: true, row });
  } catch (error) {
    console.error("DANA_TAKTIS_POST_ERROR", error);
    return jsonError(error instanceof Error ? error.message : "Gagal menyimpan transaksi Dana Taktis.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;
    const permissionResponse = await requirePermission(context.session, "DANA_TAKTIS_DELETE");
    if (permissionResponse) return permissionResponse;
    const rTUnitId = context.rTUnitId!;
    const id = text(new URL(request.url).searchParams.get("id"));
    if (!id) return jsonError("ID transaksi tidak ada.", 400);

    const existing = await prisma.tacticalFundTransaction.findFirst({ where: { id, rTUnitId } });
    if (!existing) return jsonError("Transaksi tidak ditemukan atau bukan milik RT Anda.", 404);

    await prisma.tacticalFundTransaction.delete({ where: { id } });
    return NextResponse.json({ success: true, ok: true });
  } catch (error) {
    console.error("DANA_TAKTIS_DELETE_ERROR", error);
    return jsonError(error instanceof Error ? error.message : "Gagal menghapus transaksi Dana Taktis.", 500);
  }
}
