import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

function ageFromBirthDate(value: Date | string | null | undefined) {
  if (!value) return "";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const month = now.getMonth() - d.getMonth();

  if (month < 0 || (month === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  return String(Math.max(0, age));
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
}

function filePart(value: string | null | undefined) {
  return String(value || "RT")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_EXPORT"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId;

    if (!rTUnitId) {
      return NextResponse.json(
        { error: "RT aktif tidak ditemukan." },
        { status: 400 }
      );
    }

    const [rt, rows] = await Promise.all([
      prisma.rTUnit.findUnique({
        where: { id: rTUnitId },
        select: {
          kodeRT: true,
          kodeRW: true,
          namaRT: true,
        },
      }),

      prisma.warga.findMany({
        where: { rTUnitId },
        include: { kk: true },
        orderBy: { nama: "asc" },
      }),
    ]);

    if (!rt) {
      return NextResponse.json(
        { error: "Data RT aktif tidak ditemukan." },
        { status: 404 }
      );
    }

    const headers = [
      "No KK",
      "NIK",
      "Nama Lengkap",
      "Status Tinggal",
      "Hubungan Keluarga",
      "Jenis Kelamin",
      "Alamat",
      "RT",
      "RW",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Usia",
      "Golongan Darah",
      "Agama",
      "Pendidikan Terakhir",
      "Jenis Pekerjaan",
      "Status Perkawinan",
      "Nama Ibu",
      "Nama Ayah",
      "No. Paspor",
      "Tanggal Akhir Paspor",
      "Hubungan",
      "Kode Hubungan",
      "Daerah KK Asal",
    ];

    const body = rows.map((w) => {
      const nomorKK = w.nomorKK || w.kk?.nomorKK || "";
      const alamat = w.alamat || w.kk?.alamat || "";
      const rtValue = w.rt || w.kk?.rt || "";
      const rwValue = w.rw || w.kk?.rw || "";

      return [
        nomorKK,
        w.nik || "",
        w.nama || "",
        w.statusTinggal || "",
        w.hubunganKeluarga || "",
        w.jenisKelamin || "",
        alamat,
        rtValue,
        rwValue,
        w.tempatLahir || "",
        dateOnly(w.tanggalLahir),
        w.tanggalLahir
          ? ageFromBirthDate(w.tanggalLahir)
          : (w.usia ?? ""),
        w.golonganDarah || "",
        w.agama || "",
        w.pendidikan || "",
        w.pekerjaan || "",
        w.statusKawin || "",
        w.namaIbu || "",
        w.namaAyah || "",
        w.nomorPaspor || "",
        dateOnly(w.tanggalAkhirPaspor),
        w.hubungan || "",
        w.kodeHubungan || "",
        w.daerahKKAsal || "",
      ];
    });

    const aoa = [
      ["DATA KEPENDUDUKAN"],
      [`RT ${rt.kodeRT} / RW ${rt.kodeRW}`],
      [rt.namaRT || ""],
      headers,
      ...body,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 35 },
      { wch: 8 },
      { wch: 8 },
      { wch: 20 },
      { wch: 15 },
      { wch: 8 },
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
    ];

    ws["!autofilter"] = {
      ref: `A4:X${Math.max(4, body.length + 4)}`,
    };

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Data Kependudukan"
    );

    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "buffer",
    });

    const rtCode = filePart(rt.kodeRT);
    const rwCode = filePart(rt.kodeRW);
    const rtName = filePart(rt.namaRT);

    const filename =
      `RT-${rtCode}-RW-${rwCode}` +
      (rtName ? `-${rtName}` : "") +
      `-Data-Warga.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="Data-Warga.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("WARGA_EXPORT_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal mengekspor data warga." },
      { status: 500 }
    );
  }
}


