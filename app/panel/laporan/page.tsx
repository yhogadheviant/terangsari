"use client";
import AppName from "../../ui/app-name";
import RtInfo from "../../ui/rt-info";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RtUnitInfo = {
  id: string;
  kodeRT: string;
  kodeRW: string;
  namaRT: string;
  perumahan?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
};
type Report = {
  periode: string;

  warga: {
    totalKK: number;
    totalWarga: number;

    jenisKelamin: {
      lakiLaki: number;
      perempuan: number;
    };

    kelompokUsia: {
      anak: number;
      dewasa: number;
      lansia: number;
    };

    statusTinggal: {
      tetap: number;
      sewa: number;
      kontrak: number;
      menumpang: number;
      lainnya: number;
    };
  };

  iuran: {
    totalKKWajib: number;
    lunas: number;
    belumBayar: number;
    tagihan: number;
    penerimaan: number;

    metode: {
      cash: number;
      transfer: number;
      qris: number;
      lainnya: number;
    };
  };

  kas: {
    tersedia: boolean;
    transaksi: number;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
    daftar: {
      id: string;
      type: string;
      amount: number;
      category: string;
      description?: string | null;
      date: string;
    }[];
  };

  danaTaktis: {
    masuk: number;
    keluar: number;
    saldo: number;
    transaksi: number;
    daftar: {
      id: string;
      type: string;
      amount: number;
      category: string;
      description?: string | null;
      date: string;
    }[];
  };
};

const rp = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function LaporanPage() {
  const router = useRouter();

  const [rtUnit, setRtUnit] =
    useState<RtUnitInfo | null>(null);

  const [periode, setPeriode] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  const [report, setReport] =
    useState<Report | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function loadRtUnit() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data?.authenticated && data?.user?.rTUnit) {
        setRtUnit(data.user.rTUnit);
        return;
      }

      // Fallback dari localStorage
      const raw = localStorage.getItem("rt_rtUnit");

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setRtUnit(parsed);
        } catch {
          console.warn("RT_UNIT_LOCALSTORAGE_INVALID");
        }
      }
    } catch (error) {
      console.error("LOAD_RT_UNIT_ERROR:", error);
    }
  }

  async function load() {
    try {
      setLoading(true);

      const response =
        await fetch(
          `/api/laporan?periode=${periode}`,
          {
            cache: "no-store",
          }
        );

      const text =
        await response.text();

      let result: any = {};

      try {
        result = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Response laporan tidak valid."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengambil laporan."
        );
      }

      setReport(result);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil laporan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const role =
      localStorage.getItem(
        "rt_role"
      );

    if (
      !role ||
      ![
        "ketua",
        "sekretaris",
        "bendahara",
      ].includes(role)
    ) {
      router.replace("/panel");
      return;
    }

    loadRtUnit();
    load();
  }, [periode]);

  const namaPeriode =
    useMemo(() => {
      const date =
        new Date(
          `${periode}-01T00:00:00`
        );

      return date.toLocaleDateString(
        "id-ID",
        {
          month: "long",
          year: "numeric",
        }
      );
    }, [periode]);

  function exportCSV() {
    if (!report) return;

    const rows = [
      [
        "LAPORAN RT",
      ],

      [
        "Periode",
        namaPeriode,
      ],

      [],

      [
        "DATA WARGA",
      ],

      [
        "Total KK",
        report.warga.totalKK,
      ],

      [
        "Total Warga",
        report.warga.totalWarga,
      ],

      [
        "Laki-laki",
        report.warga.jenisKelamin
          .lakiLaki,
      ],

      [
        "Perempuan",
        report.warga.jenisKelamin
          .perempuan,
      ],

      [
        "Anak < 17",
        report.warga.kelompokUsia
          .anak,
      ],

      [
        "Dewasa 17-59",
        report.warga.kelompokUsia
          .dewasa,
      ],

      [
        "Lansia >= 60",
        report.warga.kelompokUsia
          .lansia,
      ],

      [],

      [
        "IURAN",
      ],

      [
        "KK Wajib Bayar",
        report.iuran.totalKKWajib,
      ],

      [
        "Lunas",
        report.iuran.lunas,
      ],

      [
        "Belum Bayar",
        report.iuran.belumBayar,
      ],

      [
        "Tagihan",
        report.iuran.tagihan,
      ],

      [
        "Penerimaan",
        report.iuran.penerimaan,
      ],

      [
        "Cash",
        report.iuran.metode.cash,
      ],

      [
        "Transfer",
        report.iuran.metode.transfer,
      ],

      [
        "QRIS",
        report.iuran.metode.qris,
      ],

      [],

      [
        "DANA TAKTIS",
      ],

      [
        "Dana Masuk",
        report.danaTaktis.masuk,
      ],

      [
        "Dana Keluar",
        report.danaTaktis.keluar,
      ],

      [
        "Saldo Dana Taktis",
        report.danaTaktis.saldo,
      ],
    ];

    const csv =
      rows
        .map((row) =>
          row
            .map((cell) => {
              const value =
                String(
                  cell ?? ""
                );

              return `"${value.replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `laporan-${rtUnit?.kodeRT ?? "rt"}-${periode}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!report) return;

    const doc = new jsPDF("p", "mm", "a4");
    const margin = 15;
    const rupiah = (value: number) => rp(value);
    let y = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${rtUnit?.namaRT || "RUKUN TETANGGA"} / RW ${rtUnit?.kodeRW || ""}`, 105, y, { align: "center" });
    y += 7;
    doc.setFontSize(13);
    doc.text(`${rtUnit?.perumahan || ""}`, 105, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Desa Cibalongsari - Kecamatan Klari - Kabupaten Karawang",
      105, y, { align: "center" }
    );
    y += 4;
    doc.line(margin, y, 195, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN ADMINISTRASI RT", 105, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Periode: ${namaPeriode}`, 105, y, { align: "center" });
    y += 10;

    const section = (title: string) => {
      if (y > 255) {
        doc.addPage();
        y = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin, y);
      y += 3;
    };

    const tableEnd = () => {
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
    };

    section("A. DATA KEPENDUDUKAN");
    autoTable(doc, {
      startY: y,
      head: [["Keterangan", "Jumlah"]],
      body: [
        ["Total KK", report.warga.totalKK],
        ["Total Warga", report.warga.totalWarga],
        ["Laki-laki", report.warga.jenisKelamin.lakiLaki],
        ["Perempuan", report.warga.jenisKelamin.perempuan],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("B. KELOMPOK USIA");
    autoTable(doc, {
      startY: y,
      head: [["Kelompok Usia", "Jumlah"]],
      body: [
        ["Anak < 17 tahun", report.warga.kelompokUsia.anak],
        ["Dewasa 17-59 tahun", report.warga.kelompokUsia.dewasa],
        ["Lansia >= 60 tahun", report.warga.kelompokUsia.lansia],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("C. STATUS TINGGAL");
    autoTable(doc, {
      startY: y,
      head: [["Status", "Jumlah"]],
      body: [
        ["Tetap", report.warga.statusTinggal.tetap],
        ["Sewa", report.warga.statusTinggal.sewa],
        ["Kontrak", report.warga.statusTinggal.kontrak],
        ["Menumpang", report.warga.statusTinggal.menumpang],
        ["Lainnya", report.warga.statusTinggal.lainnya],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("D. REKAP IURAN");
    autoTable(doc, {
      startY: y,
      head: [["Keterangan", "Nilai"]],
      body: [
        ["KK Wajib Bayar", report.iuran.totalKKWajib],
        ["Lunas", report.iuran.lunas],
        ["Belum Bayar", report.iuran.belumBayar],
        ["Tagihan", rupiah(report.iuran.tagihan)],
        ["Penerimaan", rupiah(report.iuran.penerimaan)],
        ["Cash", rupiah(report.iuran.metode.cash)],
        ["Transfer", rupiah(report.iuran.metode.transfer)],
        ["QRIS", rupiah(report.iuran.metode.qris)],
        ["Lainnya", rupiah(report.iuran.metode.lainnya)],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("E. DAFTAR TUNGGAKAN IURAN");
    const daftarIuran = Array.isArray((report.iuran as any).daftar)
      ? (report.iuran as any).daftar
      : [];
    const tunggakan = daftarIuran.filter((item: any) => item.status !== "LUNAS");

    if (tunggakan.length === 0) {
      autoTable(doc, {
        startY: y,
        body: [["Tidak ada tunggakan iuran pada periode ini."]],
        theme: "grid",
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
    } else {
      autoTable(doc, {
        startY: y,
        head: [["No", "Nomor KK", "Kepala Keluarga", "Tagihan"]],
        body: tunggakan.map((item: any, index: number) => [
          index + 1,
          String(item.nomorKK ?? ""),
          item.kepalaKeluarga ?? "",
          rupiah(Number(item.amount ?? 0)),
        ]),
        theme: "grid",
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 38 },
          2: { cellWidth: 82 },
          3: { cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
      });
    }
    tableEnd();

    section("F. KAS RT");
    autoTable(doc, {
      startY: y,
      head: [["Keterangan", "Nominal"]],
      body: [
        ["Pemasukan", rupiah(report.kas.pemasukan)],
        ["Pengeluaran", rupiah(report.kas.pengeluaran)],
        ["Saldo", rupiah(report.kas.saldo)],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("G. DANA TAKTIS");
    autoTable(doc, {
      startY: y,
      head: [["Keterangan", "Nominal"]],
      body: [
        ["Dana Masuk", rupiah(report.danaTaktis.masuk)],
        ["Dana Keluar", rupiah(report.danaTaktis.keluar)],
        ["Saldo", rupiah(report.danaTaktis.saldo)],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();

    section("H. RINGKASAN KEUANGAN");
    autoTable(doc, {
      startY: y,
      head: [["Keterangan", "Nominal"]],
      body: [
        ["Penerimaan Iuran", rupiah(report.iuran.penerimaan)],
        ["Saldo Kas", rupiah(report.kas.saldo)],
        ["Saldo Dana Taktis", rupiah(report.danaTaktis.saldo)],
        [
          "Total Saldo",
          rupiah(
            report.iuran.penerimaan +
            report.kas.saldo +
            report.danaTaktis.saldo
          ),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    tableEnd();
    // =====================================================
    // TANDA TANGAN PDF
    // =====================================================

    if (y > 245) {
      doc.addPage();
      y = 25;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
      "Karawang, __________________ 2026",
      105,
      y,
      { align: "center" }
    );

    y += 10;

    const tandaTanganX = [40, 105, 170];

    doc.setFont("helvetica", "normal");
    doc.text("Dibuat oleh,", tandaTanganX[0], y, {
      align: "center",
    });

    doc.text("Mengetahui,", tandaTanganX[1], y, {
      align: "center",
    });

    doc.text("Mengetahui,", tandaTanganX[2], y, {
      align: "center",
    });

    y += 6;

    doc.setFont("helvetica", "bold");

    doc.text("BENDAHARA", tandaTanganX[0], y, {
      align: "center",
    });

    doc.text("SEKRETARIS", tandaTanganX[1], y, {
      align: "center",
    });

    doc.text(`${rtUnit?.namaRT || "KETUA RT"}`, tandaTanganX[2], y, {
      align: "center",
    });

    y += 30;

    doc.setFont("helvetica", "normal");

    doc.text(
      "________________________",
      tandaTanganX[0],
      y,
      { align: "center" }
    );

    doc.text(
      "________________________",
      tandaTanganX[1],
      y,
      { align: "center" }
    );

    doc.text(
      "________________________",
      tandaTanganX[2],
      y,
      { align: "center" }
    );

    y += 6;

    doc.setFont("helvetica", "bold");

    doc.text(
      "Andriyanto",
      tandaTanganX[0],
      y,
      { align: "center" }
    );

    doc.text(
      "Wawan Setiawan",
      tandaTanganX[1],
      y,
      { align: "center" }
    );

    doc.text(
      "Ikhlas Wahyu",
      tandaTanganX[2],
      y,
      { align: "center" }
    );
const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `${rtUnit?.namaRT || "RT"} / RW ${rtUnit?.kodeRW || ""} - ${rtUnit?.perumahan || ""} - Halaman ${page} dari ${pageCount}`,
        105, 290, { align: "center" }
      );
    }

    doc.save(`laporan-${rtUnit?.kodeRT ?? "rt"}-${periode}.pdf`);
  }

  function exportExcel() {
    if (!report) return;

    const iuranDaftar = Array.isArray((report.iuran as any).daftar)
      ? (report.iuran as any).daftar
      : [];

    const summaryRows = [
      [`${rtUnit?.namaRT || "RUKUN TETANGGA"} - LAPORAN`, namaPeriode],
      [],
      ["DATA KEPENDUDUKAN", ""],
      ["Total KK", report.warga.totalKK],
      ["Total Warga", report.warga.totalWarga],
      ["Laki-laki", report.warga.jenisKelamin.lakiLaki],
      ["Perempuan", report.warga.jenisKelamin.perempuan],
      ["Anak < 17 tahun", report.warga.kelompokUsia.anak],
      ["Dewasa 17-59 tahun", report.warga.kelompokUsia.dewasa],
      ["Lansia >= 60 tahun", report.warga.kelompokUsia.lansia],
      [],
      ["STATUS TINGGAL", ""],
      ["Tetap", report.warga.statusTinggal.tetap],
      ["Sewa", report.warga.statusTinggal.sewa],
      ["Kontrak", report.warga.statusTinggal.kontrak],
      ["Menumpang", report.warga.statusTinggal.menumpang],
      ["Lainnya", report.warga.statusTinggal.lainnya],
      [],
      ["IURAN WARGA", ""],
      ["KK Wajib Bayar", report.iuran.totalKKWajib],
      ["Lunas", report.iuran.lunas],
      ["Belum Bayar", report.iuran.belumBayar],
      ["Tagihan", report.iuran.tagihan],
      ["Penerimaan", report.iuran.penerimaan],
      ["Cash", report.iuran.metode.cash],
      ["Transfer", report.iuran.metode.transfer],
      ["QRIS", report.iuran.metode.qris],
      ["Lainnya", report.iuran.metode.lainnya],
      [],
      ["KAS RT", ""],
      ["Pemasukan", report.kas.pemasukan],
      ["Pengeluaran", report.kas.pengeluaran],
      ["Saldo", report.kas.saldo],
      [],
      ["DANA TAKTIS", ""],
      ["Dana Masuk", report.danaTaktis.masuk],
      ["Dana Keluar", report.danaTaktis.keluar],
      ["Saldo", report.danaTaktis.saldo],
      [],
      ["RINGKASAN KEUANGAN", ""],
      ["Penerimaan Iuran", report.iuran.penerimaan],
      ["Saldo Kas", report.kas.saldo],
      ["Saldo Dana Taktis", report.danaTaktis.saldo],
      [
        "Total Saldo",
        report.iuran.penerimaan + report.kas.saldo + report.danaTaktis.saldo,
      ],
    ];

    const iuranRows = [
      ["No", "Nomor KK", "Kepala Keluarga", "Nominal", "Status", "Metode", "Tanggal Bayar", "Catatan"],
      ...iuranDaftar.map((item: any, index: number) => [
        index + 1,
        String(item.nomorKK ?? ""),
        item.kepalaKeluarga ?? "",
        Number(item.amount ?? 0),
        item.status ?? "",
        item.method ?? "",
        item.paidAt ? new Date(item.paidAt).toLocaleDateString("id-ID") : "",
        item.note ?? "",
      ]),
    ];

    const kasRows = [
      ["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal"],
      ...report.kas.daftar.map((item) => [
        new Date(item.date).toLocaleDateString("id-ID"),
        item.type,
        item.category,
        item.description ?? "",
        Number(item.amount ?? 0),
      ]),
    ];

    const taktisRows = [
      ["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal"],
      ...report.danaTaktis.daftar.map((item) => [
        new Date(item.date).toLocaleDateString("id-ID"),
        item.type,
        item.category,
        item.description ?? "",
        Number(item.amount ?? 0),
      ]),
    ];

    const workbook = XLSX.utils.book_new();

    const addSheet = (
      name: string,
      rows: unknown[][],
      widths: number[]
    ) => {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = widths.map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, sheet, name);
      return sheet;
    };

    const ringkasanSheet = addSheet(
      "Ringkasan",
      summaryRows,
      [32, 24]
    );

    const iuranSheet = addSheet(
      "Iuran",
      iuranRows,
      [7, 20, 34, 16, 16, 16, 18, 32]
    );

    const kasSheet = addSheet(
      "Kas RT",
      kasRows,
      [16, 18, 22, 38, 18]
    );

    const danaSheet = addSheet(
      "Dana Taktis",
      taktisRows,
      [16, 18, 22, 38, 18]
    );

    // Nomor KK harus selalu menjadi TEXT agar tidak berubah
    // menjadi notasi ilmiah seperti 3,215E+15.
    if (iuranSheet) {
      for (
        let row = 2;
        row <= iuranDaftar.length + 1;
        row++
      ) {
        const cell = iuranSheet[`B${row}`];

        if (cell) {
          cell.t = "s";
          cell.v = String(cell.v ?? "");
        }

        const nominal = iuranSheet[`D${row}`];

        if (nominal) {
          nominal.t = "n";
          nominal.z = '"Rp" #,##0';
        }
      }
    }

    // Format nominal Kas RT sebagai Rupiah.
    if (kasSheet) {
      for (
        let row = 2;
        row <= report.kas.daftar.length + 1;
        row++
      ) {
        const cell = kasSheet[`E${row}`];

        if (cell) {
          cell.t = "n";
          cell.z = '"Rp" #,##0';
        }
      }
    }

    // Format nominal Dana Taktis sebagai Rupiah.
    if (danaSheet) {
      for (
        let row = 2;
        row <= report.danaTaktis.daftar.length + 1;
        row++
      ) {
        const cell = danaSheet[`E${row}`];

        if (cell) {
          cell.t = "n";
          cell.z = '"Rp" #,##0';
        }
      }
    }

    // Format nilai keuangan pada Ringkasan sebagai Rupiah.
    if (ringkasanSheet) {
      for (
        let row = 1;
        row <= summaryRows.length;
        row++
      ) {
        const label = String(
          ringkasanSheet[`A${row}`]?.v ?? ""
        );

        if (
          [
            "Tagihan",
            "Penerimaan",
            "Cash",
            "Transfer",
            "QRIS",
            "Lainnya",
            "Pemasukan",
            "Pengeluaran",
            "Saldo",
            "Dana Masuk",
            "Dana Keluar",
            "Saldo Dana Taktis",
            "Penerimaan Iuran",
            "Saldo Kas",
            "Total Saldo",
          ].includes(label)
        ) {
          const cell = ringkasanSheet[`B${row}`];

          if (cell) {
            cell.t = "n";
            cell.z = '"Rp" #,##0';
          }
        }
      }
    }

    XLSX.writeFile(
      workbook,
      `laporan-${rtUnit?.kodeRT ?? "rt"}-${periode}.xlsx`
    );
  }

  if (loading || !report) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6">
          Memuat laporan...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          section {
            break-inside: avoid;
          }
        }
      `}</style>

      <header className="bg-blue-700 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">

          <div>
            <div className="text-xl font-black">
              &#128196; Laporan RT
            </div>

            <div className="mt-1 text-xs text-blue-100">
              Laporan administrasi RT
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              &#128424;&#65039; Cetak / PDF
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              &#128229; CSV
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              &#128202; Excel
            </button>


            <button
              type="button"
              onClick={exportPDF}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              &#128196; PDF
            </button>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">

        {/* JUDUL LAPORAN */}

        <section className="rounded-2xl border bg-white p-6">

          <div className="text-center">

            <div className="text-sm font-semibold">
              RUKUN TETANGGA (RT) {rtUnit?.kodeRT || ""} RW {rtUnit?.kodeRW || ""}
            </div>

            <div className="text-xl font-black">
              {rtUnit?.perumahan || ""}
            </div>

            <div className="text-sm text-slate-500">
              Desa Cibalongsari,
              Kecamatan Klari,
              Kabupaten Karawang
            </div>

            <div className="mt-4 text-lg font-black">
              LAPORAN ADMINISTRASI RT
            </div>

            <div className="text-sm text-slate-500">
              Periode {namaPeriode}
            </div>

          </div>

          <div className="mt-5 flex justify-center print:hidden">

            <input
              type="month"
              value={periode}
              onChange={(e) =>
                setPeriode(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-2"
            />

          </div>

        </section>

        {/* DATA WARGA */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            Data Kependudukan
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Card
              label="Total KK"
              value={
                report.warga.totalKK
              }
            />

            <Card
              label="Total Warga"
              value={
                report.warga.totalWarga
              }
            />

            <Card
              label="Laki-laki"
              value={
                report.warga
                  .jenisKelamin
                  .lakiLaki
              }
            />

            <Card
              label="Perempuan"
              value={
                report.warga
                  .jenisKelamin
                  .perempuan
              }
            />

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <MiniCard
              label="Anak < 17 tahun"
              value={
                report.warga
                  .kelompokUsia
                  .anak
              }
            />

            <MiniCard
              label="Dewasa 17-59 tahun"
              value={
                report.warga
                  .kelompokUsia
                  .dewasa
              }
            />

            <MiniCard
              label="Lansia >= 60 tahun"
              value={
                report.warga
                  .kelompokUsia
                  .lansia
              }
            />

          </div>

        </section>

        {/* STATUS TINGGAL */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            Status Tinggal
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-5">

            <MiniCard
              label="Tetap"
              value={
                report.warga
                  .statusTinggal
                  .tetap
              }
            />

            <MiniCard
              label="Sewa"
              value={
                report.warga
                  .statusTinggal
                  .sewa
              }
            />

            <MiniCard
              label="Kontrak"
              value={
                report.warga
                  .statusTinggal
                  .kontrak
              }
            />

            <MiniCard
              label="Menumpang"
              value={
                report.warga
                  .statusTinggal
                  .menumpang
              }
            />

            <MiniCard
              label="Lainnya"
              value={
                report.warga
                  .statusTinggal
                  .lainnya
              }
            />

          </div>

        </section>

        {/* IURAN */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            Iuran Warga
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Card
              label="KK Wajib Bayar"
              value={
                report.iuran
                  .totalKKWajib
              }
            />

            <Card
              label="Lunas"
              value={
                report.iuran.lunas
              }
            />

            <Card
              label="Belum Bayar"
              value={
                report.iuran
                  .belumBayar
              }
            />

            <Card
              label="Penerimaan"
              value={rp(
                report.iuran
                  .penerimaan
              )}
            />

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <MiniMoney
              label="CASH"
              value={
                report.iuran
                  .metode.cash
              }
            />

            <MiniMoney
              label="TRANSFER"
              value={
                report.iuran
                  .metode.transfer
              }
            />

            <MiniMoney
              label="QRIS"
              value={
                report.iuran
                  .metode.qris
              }
            />

            <MiniMoney
              label="LAINNYA"
              value={
                report.iuran
                  .metode.lainnya
              }
            />

          </div>

        </section>

        {/* KAS RT */}

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-black">
            Kas RT
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMoney
              label="Pemasukan"
              value={report.kas.pemasukan}
            />
            <MiniMoney
              label="Pengeluaran"
              value={report.kas.pengeluaran}
            />
            <MiniMoney
              label="Saldo"
              value={report.kas.saldo}
            />
          </div>

          <div className="mt-5 overflow-auto rounded-xl border">
            <table className="min-w-[750px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left">Tanggal</th>
                  <th className="px-3 py-3 text-left">Jenis</th>
                  <th className="px-3 py-3 text-left">Kategori</th>
                  <th className="px-3 py-3 text-left">Keterangan</th>
                  <th className="px-3 py-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {report.kas.daftar.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-3">
                      {new Date(item.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3">{item.type}</td>
                    <td className="px-3 py-3">{item.category}</td>
                    <td className="px-3 py-3">
                      {item.description || "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {rp(item.amount)}
                    </td>
                  </tr>
                ))}
                {!report.kas.daftar.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      Tidak ada transaksi Kas RT pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* DANA TAKTIS */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            Dana Taktis
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">

            <MiniMoney
              label="Dana Masuk"
              value={
                report.danaTaktis
                  .masuk
              }
            />

            <MiniMoney
              label="Dana Keluar"
              value={
                report.danaTaktis
                  .keluar
              }
            />

            <MiniMoney
              label="Saldo"
              value={
                report.danaTaktis
                  .saldo
              }
            />

          </div>

        </section>

        {/* TRANSAKSI DANA TAKTIS */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            Riwayat Dana Taktis
          </h2>

          <div className="mt-4 overflow-auto rounded-xl border">

            <table className="min-w-[750px] w-full text-sm">

              <thead className="bg-slate-50">

                <tr>
                  <th className="px-3 py-3 text-left">
                    Tanggal
                  </th>

                  <th className="px-3 py-3 text-left">
                    Jenis
                  </th>

                  <th className="px-3 py-3 text-left">
                    Kategori
                  </th>

                  <th className="px-3 py-3 text-left">
                    Keterangan
                  </th>

                  <th className="px-3 py-3 text-right">
                    Nominal
                  </th>
                </tr>

              </thead>

              <tbody>

                {report.danaTaktis
                  .daftar
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="border-t"
                    >

                      <td className="px-3 py-3">
                        {new Date(
                          item.date
                        ).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {item.type ===
                        "MASUK"
                          ? "MASUK"
                          : "KELUAR"}
                      </td>

                      <td className="px-3 py-3">
                        {item.category}
                      </td>

                      <td className="px-3 py-3">
                        {item.description ||
                          "-"}
                      </td>

                      <td className="px-3 py-3 text-right font-semibold">
                        {rp(
                          item.amount
                        )}
                      </td>

                    </tr>
                  ))}

                {!report.danaTaktis
                  .daftar
                  .length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      Tidak ada transaksi
                      dana taktis pada
                      periode ini.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* RINGKASAN KEUANGAN */}

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-black">
            Ringkasan Keuangan
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniMoney
              label="Penerimaan Iuran"
              value={report.iuran.penerimaan}
            />
            <MiniMoney
              label="Saldo Kas"
              value={report.kas.saldo}
            />
            <MiniMoney
              label="Saldo Dana Taktis"
              value={report.danaTaktis.saldo}
            />
            <MiniMoney
              label="Total Saldo"
              value={
                report.iuran.penerimaan +
                report.kas.saldo +
                report.danaTaktis.saldo
              }
            />
          </div>
        </section>

        {/* FOOTER / TANDA TANGAN */}

        <section
          className="hidden print:block"
          style={{
            pageBreakInside: "avoid",
            breakInside: "avoid",
            marginTop: "40px",
            width: "100%",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            Karawang, __________________ 2026
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ width: "30%" }}>
              <div>Dibuat oleh,</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                BENDAHARA
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Andriyanto
              </div>
            </div>

            <div style={{ width: "30%" }}>
              <div>Mengetahui,</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                SEKRETARIS
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Wawan Setiawan
              </div>
            </div>

            <div style={{ width: "30%" }}>
              <div>Mengetahui,</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                {rtUnit?.namaRT || "KETUA RT"}
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Ikhlas Wahyu
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

/* ========================================================
   COMPONENTS
======================================================== */

function Card({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-black">
        {value}
      </div>
    </div>
  );
}

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black">
        {value}
      </div>
    </div>
  );
}

function MiniMoney({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-black">
        {rp(value)}
      </div>
    </div>
  );
}











