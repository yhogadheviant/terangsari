import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/app/lib/activity-log";
import * as XLSX from "xlsx";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

type ParsedRecord = {
  date: Date;
  type: "MASUK" | "KELUAR";
  amount: number;
  category: string;
  description: string;
};

type PreviewRow = ParsedRecord & {
  rowNumber: number;
  sheet: string;
  warning?: string;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
}

function toAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  // Excel/Indonesian number formats:
  // 1.234.567,89 / 1,234,567.89 / 1234567
  let s = raw.replace(/[^\d,.-]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    s = decimals <= 2 ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = s.length - lastDot - 1;
    s = decimals <= 2 ? s : s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // ISO date
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // Indonesian/common date: D/M/YYYY or D-M-YYYY
  const m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) return d;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rowToObject(sheetRows: unknown[][], headerIndex: number) {
  const header = sheetRows[headerIndex] ?? [];
  const keys = header.map(normalize);

  const findKey = (...aliases: string[]) => {
    const set = aliases.map(normalize);
    const idx = keys.findIndex((k) => set.includes(k));
    return idx >= 0 ? idx : null;
  };

  return {
    dateKey: findKey("tanggal", "date", "tgl"),
    descKey: findKey("keterangan", "description", "uraian", "catatan", "transaksi"),
    categoryKey: findKey("kategori", "category"),
    debitKey: findKey("debet", "debit", "masuk", "dana masuk", "pemasukan"),
    creditKey: findKey("kredit", "credit", "keluar", "dana keluar", "pengeluaran"),
    balanceKey: findKey("saldo", "balance"),
  };
}

function findHeader(rows: unknown[][]) {
  // Search first 30 rows so title rows above the table are allowed.
  const limit = Math.min(rows.length, 30);

  for (let i = 0; i < limit; i++) {
    const info = rowToObject(rows, i);
    if (
      info.dateKey !== null &&
      (info.debitKey !== null || info.creditKey !== null)
    ) {
      return { headerIndex: i, ...info };
    }
  }

  return null;
}

function cleanDescription(value: unknown): string {
  return String(value ?? "").trim();
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((v) => String(v ?? "").trim() === "");
}

function parseSheet(sheetName: string, rows: unknown[][]): PreviewRow[] {
  const header = findHeader(rows);
  if (!header) return [];

  const dateKey = header.dateKey;
  if (dateKey === null) return [];

  let lastDate: Date | null = null;
  const records: PreviewRow[] = [];

  for (let i = header.headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (isBlankRow(row)) continue;

    const rawDate = row[dateKey];
    const parsedDate = toDate(rawDate);
    if (parsedDate) lastDate = parsedDate;

    const date = parsedDate ?? lastDate;
    const description = header.descKey !== null
      ? cleanDescription(row[header.descKey])
      : "";

    const category = header.categoryKey !== null
      ? cleanDescription(row[header.categoryKey])
      : "Dana Taktis";

    const debit = header.debitKey !== null ? toAmount(row[header.debitKey]) : 0;
    const credit = header.creditKey !== null ? toAmount(row[header.creditKey]) : 0;

    if (!date && debit === 0 && credit === 0 && !description) continue;

    let warning: string | undefined;

    if (!date) {
      warning = "Tanggal tidak ditemukan dan tidak ada tanggal sebelumnya.";
    } else if (debit > 0 && credit > 0) {
      warning = "DEBET dan KREDIT terisi sekaligus; baris tidak dapat diimport otomatis.";
    } else if (debit === 0 && credit === 0) {
      warning = "Tidak ada nominal DEBET/KREDIT.";
    }

    const type: "MASUK" | "KELUAR" = debit > 0 ? "MASUK" : "KELUAR";
    const amount = debit > 0 ? debit : credit;

    records.push({
      rowNumber: i + 1,
      sheet: sheetName,
      date: date ?? new Date(0),
      type,
      amount,
      category: category || "Dana Taktis",
      description: description || "(Tanpa keterangan)",
      warning,
    });
  }

  return records;
}

async function parseFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const allSheets: Array<{
    name: string;
    rows: unknown[][];
    records: PreviewRow[];
  }> = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    const records = parseSheet(name, rows);
    allSheets.push({ name, rows, records });
  }

  const candidateSheets = allSheets.filter((s) => s.records.length > 0);

  if (candidateSheets.length === 0) {
    throw new Error(
      "Format Excel tidak dikenali. Tidak ditemukan sheet dengan kolom TANGGAL dan DEBET/KREDIT."
    );
  }

  // Prefer sheets whose names look like cash books.
  const preferred = candidateSheets.filter((s) =>
    /(^|\s)(kas|cash|dana|taktis)(\s|$)/i.test(s.name)
  );

  const selected = preferred.length > 0 ? preferred : candidateSheets;

  // By default combine all compatible cash-book sheets.
  const records = selected.flatMap((s) => s.records);

  return {
    sheetNames: selected.map((s) => s.name),
    availableSheets: candidateSheets.map((s) => ({
      name: s.name,
      rows: s.records.length,
    })),
    records,
  };
}

function validateRecords(records: PreviewRow[]) {
  return records.map((r) => {
    let warning = r.warning;

    if (!warning && r.amount <= 0) {
      warning = "Nominal harus lebih besar dari 0.";
    }

    return { ...r, warning };
  });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const rTUnitId = context.rTUnitId!;
    const permissionResponse = await requirePermission(
      context.session,
      "DANA_TAKTIS_CREATE"
    );

    if (permissionResponse) return permissionResponse;

    const formData = await request.formData();
    const file = formData.get("file");
    const action = String(formData.get("action") || "preview").toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File Excel tidak ditemukan." }, { status: 400 });
    }

    const parsed = await parseFile(file);
    const records = validateRecords(parsed.records);

    const validRecords = records.filter(
      (r) => !r.warning && r.amount > 0 && r.date.getTime() > 0
    );
    const invalidRecords = records.filter((r) => r.warning);

    // Calculate the running book-cash balance in preview order.
    // Excel's SALDO column is intentionally not imported as a separate field:
    // saldo is derived from DEBET - KREDIT so the application remains the source of truth.
    let runningBalance = 0;
    const previewRows = records.map((r) => {
      if (!r.warning && r.amount > 0 && r.date.getTime() > 0) {
        runningBalance += r.type === "MASUK" ? r.amount : -r.amount;
      }

      return {
        rowNumber: r.rowNumber,
        sheet: r.sheet,
        date: r.date.toISOString(),
        description: r.description,
        category: r.category,
        type: r.type,
        amount: r.amount,
        saldo: runningBalance,
        warning: r.warning ?? null,
      };
    });

    if (action !== "confirm") {
      return NextResponse.json({
        ok: true,
        action: "preview",
        fileName: file.name,
        sheets: parsed.availableSheets,
        selectedSheets: parsed.sheetNames,
        totalRows: records.length,
        validRows: validRecords.length,
        invalidRows: invalidRecords.length,
        saldoAkhir: runningBalance,
        rows: previewRows,
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris valid yang dapat diimport." },
        { status: 400 }
      );
    }

    // Prevent obvious duplicate imports based on the same RT/date/type/amount/description.
    // This is intentionally checked before createMany so re-importing the same sheet
    // does not blindly duplicate every transaction.
    const existing = await prisma.tacticalFundTransaction.findMany({
      where: { rTUnitId },
      select: {
        date: true,
        type: true,
        amount: true,
        description: true,
      },
    });

    const existingKeys = new Set(
      existing.map((x) =>
        [
          new Date(x.date).toISOString().slice(0, 10),
          x.type,
          x.amount,
          String(x.description ?? "").trim(),
        ].join("|")
      )
    );

    const newRecords = validRecords.filter((r) => {
      const key = [
        r.date.toISOString().slice(0, 10),
        r.type,
        r.amount,
        r.description.trim(),
      ].join("|");

      return !existingKeys.has(key);
    });

    if (newRecords.length === 0) {
      return NextResponse.json({
        ok: true,
        action: "confirm",
        message: "Semua transaksi pada file sudah ada. Tidak ada data baru yang diimport.",
        imported: 0,
        skippedDuplicates: validRecords.length,
        skippedInvalid: invalidRecords.length,
      });
    }

    const orderedRecords = [...newRecords].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;

      const sheetDiff = a.sheet.localeCompare(b.sheet);
      if (sheetDiff !== 0) return sheetDiff;

      return a.rowNumber - b.rowNumber;
    });

    await prisma.$transaction(
      async (tx) => {
        const [saldoMasuk, saldoKeluar] = await Promise.all([
          tx.tacticalFundTransaction.aggregate({
            _sum: { amount: true },
            where: {
              rTUnitId,
              type: "MASUK",
            },
          }),
          tx.tacticalFundTransaction.aggregate({
            _sum: { amount: true },
            where: {
              rTUnitId,
              type: "KELUAR",
            },
          }),
        ]);

        const saldoSebelumImport =
          Number(saldoMasuk._sum.amount ?? 0) -
          Number(saldoKeluar._sum.amount ?? 0);

        let runningImportBalance = saldoSebelumImport;

        for (const record of orderedRecords) {
          if (record.type === "MASUK") {
            runningImportBalance += record.amount;
          } else {
            runningImportBalance -= record.amount;
          }

          if (runningImportBalance < 0) {
            throw new Error(
              `SALDO_IMPORT_TAKTIS_TIDAK_CUKUP:${JSON.stringify({
                saldoSebelumImport,
                rowNumber: record.rowNumber,
                sheet: record.sheet,
                tanggal: record.date.toISOString(),
                type: record.type,
                amount: record.amount,
                saldoSetelahTransaksi: runningImportBalance,
              })}`
            );
          }
        }

        await tx.tacticalFundTransaction.createMany({
          data: newRecords.map((r) => ({
            type: r.type,
            amount: r.amount,
            category: r.category || "Dana Taktis",
            description: r.description || null,
            date: r.date,
            rTUnitId,
          })),
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "IMPORT",
      description: `Import Dana Taktis dari file ${file.name}`,
      module: "DANA_TAKTIS",
      targetType: "TacticalFundTransaction",
      metadata: {
        fileName: file.name,
        imported: newRecords.length,
        skippedDuplicates: validRecords.length - newRecords.length,
        skippedInvalid: invalidRecords.length,
        sheets: parsed.sheetNames,
        saldoAkhirPreview: runningBalance,
      },
      rTUnitId,
      request,
    });
    return NextResponse.json({
      ok: true,
      action: "confirm",
      message: "Import Dana Taktis berhasil.",
      imported: newRecords.length,
      skippedDuplicates: validRecords.length - newRecords.length,
      skippedInvalid: invalidRecords.length,
      sheets: parsed.sheetNames,
    });
  } catch (error) {
    console.error("DANA_TAKTIS_IMPORT_ERROR", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat import.";

    if (message.startsWith("SALDO_IMPORT_TAKTIS_TIDAK_CUKUP:")) {
      try {
        const detail = JSON.parse(
          message.slice("SALDO_IMPORT_TAKTIS_TIDAK_CUKUP:".length)
        );

        return NextResponse.json(
          {
            error: "Import ditolak karena saldo Dana Taktis menjadi negatif.",
            ...detail,
          },
          { status: 400 }
        );
      } catch {
        return NextResponse.json(
          {
            error: "Import ditolak karena saldo Dana Taktis tidak mencukupi.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

