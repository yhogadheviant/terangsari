"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
      balita: number;
      anak5_9: number;
      anak10_14: number;
      remaja15_19: number;
      dewasa20_59: number;
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

  const [minUsia, setMinUsia] =
    useState("");
  const [maxUsia, setMaxUsia] =
    useState("");
  const [hasilFilterUsia, setHasilFilterUsia] =
    useState<number | null>(null);
  const [filterUsiaLoading, setFilterUsiaLoading] =
    useState(false);

  async function filterKelompokUsia() {
    const minText = minUsia.trim();
    const maxText = maxUsia.trim();

    if (!minText && !maxText) {
      setHasilFilterUsia(null);
      return;
    }

    const min = minText ? Number(minText) : 0;
    const max = maxText ? Number(maxText) : 200;

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max < 0 ||
      min > 200 ||
      max > 200 ||
      min > max
    ) {
      alert("Rentang usia tidak valid. Contoh: 10 sampai 17 tahun.");
      return;
    }

    try {
      setFilterUsiaLoading(true);

      const response = await fetch("/api/warga", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(
          data?.error || "Gagal mengambil data warga."
        );
      }

      const jumlah = data.filter((w: any) => {
        const usia = Number(w.usia);
        return Number.isFinite(usia) && usia >= min && usia <= max;
      }).length;

      setHasilFilterUsia(jumlah);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal memfilter kelompok usia."
      );
    } finally {
      setFilterUsiaLoading(false);
    }
  }

  function resetFilterUsia() {
    setMinUsia("");
    setMaxUsia("");
    setHasilFilterUsia(null);
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
    // Akses laporan ditentukan oleh middleware/session.
    // Jangan memakai localStorage "rt11_role" karena key tersebut
    // tidak konsisten dengan sistem login project dan menyebabkan
    // halaman laporan salah redirect ke /panel.
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
        "LAPORAN RT 11 DIGITAL",
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
        "Balita 0-4",
        report.warga.kelompokUsia.balita,
      ],

      [
        "Anak 5-9",
        report.warga.kelompokUsia.anak5_9,
      ],

      [
        "Anak 10-14",
        report.warga.kelompokUsia.anak10_14,
      ],

      [
        "Remaja 15-19",
        report.warga.kelompokUsia.remaja15_19,
      ],

      [
        "Dewasa 20-59",
        report.warga.kelompokUsia.dewasa20_59,
      ],

      [
        "Lansia >= 60",
        report.warga.kelompokUsia.lansia,
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
      `laporan-rt11-${periode}.csv`;

    link.click();

    URL.revokeObjectURL(url);
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

      <header className="bg-blue-700 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">

          <div>
            <div className="text-xl font-black">
              📄 Laporan RT
            </div>

            <div className="mt-1 text-xs text-blue-100">
              Laporan administrasi RT 11
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
              🖨️ Cetak / PDF
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              📥 CSV
            </button>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">

        {/* JUDUL LAPORAN */}

        <section className="rounded-2xl border bg-white p-6">

          <div className="text-center">

            <div className="text-sm font-semibold">
              RUKUN TETANGGA (RT) 011 RW 005
            </div>

            <div className="text-xl font-black">
              PERUMAHAN TERANGSARI 1
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
            👥 Data Kependudukan
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

          <div className="mt-5">
            <div className="mb-3 text-sm font-black">
              Kelompok Usia
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <MiniCard
                label="Balita 0–4"
                value={report.warga.kelompokUsia.balita}
              />

              <MiniCard
                label="Anak 5–9"
                value={report.warga.kelompokUsia.anak5_9}
              />

              <MiniCard
                label="Anak 10–14"
                value={report.warga.kelompokUsia.anak10_14}
              />

              <MiniCard
                label="Remaja 15–19"
                value={report.warga.kelompokUsia.remaja15_19}
              />

              <MiniCard
                label="Dewasa 20–59"
                value={report.warga.kelompokUsia.dewasa20_59}
              />

              <MiniCard
                label="Lansia ≥ 60"
                value={report.warga.kelompokUsia.lansia}
              />
            </div>

            <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-xs text-slate-500">
              Kelompok usia dihitung berdasarkan usia warga pada database.
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-black text-slate-800">
                🔎 Filter Kelompok Usia
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Masukkan batas usia untuk melihat jumlah warga dalam rentang tertentu.
                Contoh: usia 10 hingga usia 17.
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Usia minimum
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={minUsia}
                    onChange={(e) => setMinUsia(e.target.value)}
                    placeholder="Contoh 10"
                    className="w-full rounded-xl border bg-white px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Usia maksimum
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={maxUsia}
                    onChange={(e) => setMaxUsia(e.target.value)}
                    placeholder="Contoh 17"
                    className="w-full rounded-xl border bg-white px-3 py-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={filterKelompokUsia}
                  disabled={filterUsiaLoading}
                  className="self-end rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {filterUsiaLoading ? "Memproses..." : "Tampilkan"}
                </button>

                <button
                  type="button"
                  onClick={resetFilterUsia}
                  className="self-end rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Reset
                </button>
              </div>

              {hasilFilterUsia !== null && (
                <div className="mt-4 rounded-xl border bg-white p-4">
                  <div className="text-xs text-slate-500">
                    Hasil filter
                  </div>
                  <div className="mt-1 text-lg font-black text-blue-700">
                    {hasilFilterUsia} warga
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Usia {minUsia || "0"} hingga {maxUsia || "200"} tahun
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* STATUS TINGGAL */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            🏠 Status Tinggal
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
            💰 Iuran Warga
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

        {/* DANA TAKTIS */}

        <section className="rounded-2xl border bg-white p-5">

          <h2 className="text-lg font-black">
            🛡️ Dana Taktis
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

        {/* FOOTER */}

        <section className="hidden print:block">

          <div className="mt-10 grid grid-cols-2 gap-20 text-center">

            <div>
              Mengetahui,
              <br />
              Ketua RT 011
              <br />
              <br />
              <br />
              (________________)
            </div>

            <div>
              Bendahara RT 011
              <br />
              <br />
              <br />
              <br />
              (________________)
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
