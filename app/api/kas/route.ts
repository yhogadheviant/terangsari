// app/api/kas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { logActivity } from "@/app/lib/activity-log";

function clean(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function parseAmount(value: unknown): number {
  const n = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function parseDate(value: unknown): Date {
  if (!value) return new Date();

  const text = clean(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  return date;
}

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

  return {
    year,
    month,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

function periodKey(date: Date) {
  return date.toISOString().slice(0, 7);
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

    const rTUnitId = context.rTUnitId!;
    const permissionResponse = await requirePermission(context.session, "KAS_VIEW");

    if (permissionResponse) {
      return permissionResponse;
    }

    const url = new URL(request.url);

    const periode =
      url.searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const { year, month, start, end } = getPeriodRange(periode);

    // Histori tetap hanya menampilkan transaksi bulan yang dipilih.
    const rows = await prisma.kasTransaction.findMany({
      where: {
        rTUnitId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Rekap kumulatif mengambil semua transaksi sampai akhir
    // bulan yang dipilih.
    const cumulativeRows = await prisma.kasTransaction.findMany({
      where: {
        rTUnitId,
        date: {
          lt: end,
        },
      },
      orderBy: [
        { date: "asc" },
        { createdAt: "asc" },
      ],
    });

    const normalized = rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      category: row.category,
      description: row.description,
      date: row.date.toISOString(),
    }));

    let pemasukanBulanIni = 0;
    let pengeluaranBulanIni = 0;

    for (const row of rows) {
      if (row.type === "PEMASUKAN") {
        pemasukanBulanIni += row.amount;
      } else {
        pengeluaranBulanIni += row.amount;
      }
    }

    const monthlyMap = new Map<
      string,
      { pemasukan: number; pengeluaran: number }
    >();

    let pemasukanKumulatif = 0;
    let pengeluaranKumulatif = 0;

    for (const row of cumulativeRows) {
      const key = periodKey(row.date);

      const current = monthlyMap.get(key) || {
        pemasukan: 0,
        pengeluaran: 0,
      };

      if (row.type === "PEMASUKAN") {
        current.pemasukan += row.amount;
        pemasukanKumulatif += row.amount;
      } else {
        current.pengeluaran += row.amount;
        pengeluaranKumulatif += row.amount;
      }

      monthlyMap.set(key, current);
    }

    const rekapBulanan: {
      periode: string;
      pemasukan: number;
      pengeluaran: number;
      pemasukanKumulatif: number;
      pengeluaranKumulatif: number;
      saldoKumulatif: number;
    }[] = [];

    if (cumulativeRows.length > 0) {
      const firstPeriod = periodKey(cumulativeRows[0].date);
      const [firstYear, firstMonth] = firstPeriod.split("-").map(Number);

      let cursorYear = firstYear;
      let cursorMonth = firstMonth;
      let runningIn = 0;
      let runningOut = 0;

      while (
        cursorYear < year ||
        (cursorYear === year && cursorMonth <= month)
      ) {
        const key = `${cursorYear}-${String(cursorMonth).padStart(2, "0")}`;

        const current = monthlyMap.get(key) || {
          pemasukan: 0,
          pengeluaran: 0,
        };

        runningIn += current.pemasukan;
        runningOut += current.pengeluaran;

        rekapBulanan.push({
          periode: key,
          pemasukan: current.pemasukan,
          pengeluaran: current.pengeluaran,
          pemasukanKumulatif: runningIn,
          pengeluaranKumulatif: runningOut,
          saldoKumulatif: runningIn - runningOut,
        });

        cursorMonth++;

        if (cursorMonth > 12) {
          cursorMonth = 1;
          cursorYear++;
        }
      }
    }

    const saldoKumulatif =
      pemasukanKumulatif - pengeluaranKumulatif;

    return NextResponse.json({
      success: true,
      periode,
      rows: normalized,
      summary: {
        pemasukan: pemasukanKumulatif,
        pengeluaran: pengeluaranKumulatif,
        saldo: saldoKumulatif,
        pemasukanBulanIni,
        pengeluaranBulanIni,
        saldoBulanIni:
          pemasukanBulanIni - pengeluaranBulanIni,
      },
      rekapBulanan,
    });
  } catch (error) {
    console.error("KAS_GET_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal membaca Kas RT.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;

    const rTUnitId = context.rTUnitId!;
    const permissionResponse = await requirePermission(context.session, "KAS_CREATE");

    if (permissionResponse) {
      return permissionResponse;
    }

    

    const body = await request.json();
    const type = clean(body.type).toUpperCase();

    if (type !== "PEMASUKAN" && type !== "PENGELUARAN") {
      return jsonError("Jenis transaksi tidak valid.", 400);
    }

    const amount = parseAmount(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Nominal harus lebih dari 0.", 400);
    }

    const category = clean(body.category);

    if (!category) {
      return jsonError("Kategori wajib diisi.", 400);
    }

    const description = clean(body.description) || null;
    const date = parseDate(body.date);

    const row = await prisma.kasTransaction.create({
      data: {
        type: type as "PEMASUKAN" | "PENGELUARAN",
        amount,
        category,
        description,
        date,
        rTUnitId,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "CREATE",
      module: "KAS",
      targetType: "KasTransaction",
      targetId: row.id,
      description: "Transaksi Kas berhasil dibuat.",
      metadata: {
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
      rTUnitId,
      request,
    });

    return NextResponse.json({
      success: true,
      ok: true,
      row: {
        id: row.id,
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
    });
  } catch (error) {
    console.error("KAS_POST_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan transaksi Kas RT.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;

    const rTUnitId = context.rTUnitId!;
    const permissionResponse = await requirePermission(context.session, "KAS_UPDATE");

    if (permissionResponse) {
      return permissionResponse;
    }

    

    const body = await request.json();
    const id = clean(body.id);

    if (!id) {
      return jsonError("ID transaksi tidak ada.", 400);
    }

    const existing = await prisma.kasTransaction.findFirst({
      where: {
        id,
        rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Transaksi tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    const type = clean(body.type).toUpperCase();

    if (type !== "PEMASUKAN" && type !== "PENGELUARAN") {
      return jsonError("Jenis transaksi tidak valid.", 400);
    }

    const amount = parseAmount(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Nominal harus lebih dari 0.", 400);
    }

    const category = clean(body.category);

    if (!category) {
      return jsonError("Kategori wajib diisi.", 400);
    }

    const description = clean(body.description) || null;
    const date = parseDate(body.date);

    const row = await prisma.kasTransaction.update({
      where: { id },
      data: {
        type: type as "PEMASUKAN" | "PENGELUARAN",
        amount,
        category,
        description,
        date,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "UPDATE",
      module: "KAS",
      targetType: "KasTransaction",
      targetId: row.id,
      description: "Transaksi Kas berhasil diperbarui.",
      metadata: {
        typeSebelumnya: existing.type,
        amountSebelumnya: existing.amount,
        categorySebelumnya: existing.category,
        descriptionSebelumnya: existing.description,
        dateSebelumnya: existing.date.toISOString(),
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
      rTUnitId,
      request,
    });

    return NextResponse.json({
      success: true,
      ok: true,
      row: {
        id: row.id,
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
    });
  } catch (error) {
    console.error("KAS_PATCH_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal mengubah transaksi Kas RT.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;

    const rTUnitId = context.rTUnitId!;
    const permissionResponse = await requirePermission(context.session, "KAS_DELETE");

    if (permissionResponse) {
      return permissionResponse;
    }


    

    const url = new URL(request.url);
    const id = clean(url.searchParams.get("id"));

    if (!id) {
      return jsonError("ID transaksi tidak ada.", 400);
    }

    const existing = await prisma.kasTransaction.findFirst({
      where: {
        id,
        rTUnitId,
      },
    });

    if (!existing) {
      return jsonError(
        "Transaksi tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    await prisma.kasTransaction.delete({
      where: { id },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "DELETE",
      module: "KAS",
      targetType: "KasTransaction",
      targetId: existing.id,
      description: "Transaksi Kas berhasil dihapus.",
      metadata: {
        type: existing.type,
        amount: existing.amount,
        category: existing.category,
        description: existing.description,
        date: existing.date.toISOString(),
      },
      rTUnitId,
      request,
    });

    return NextResponse.json({
      success: true,
      ok: true,
    });
  } catch (error) {
    console.error("KAS_DELETE_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menghapus transaksi Kas RT.",
      500
    );
  }
}
