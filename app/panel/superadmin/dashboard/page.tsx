"use client";

import { useEffect, useMemo, useState } from "react";

type Warga = {
  id: string;
  nik?: string | null;
  nama?: string | null;
  nomorKK?: string | null;
  jenisKelamin?: string | null;
  hubunganKeluarga?: string | null;
  tanggalLahir?: string | null;
  usia?: number | null;
  agama?: string | null;
  pekerjaan?: string | null;
  statusTinggal?: string | null;
  alamat?: string | null;
};

type KK = {
  id: string;
  nomorKK?: string | null;
  kepalaKeluarga?: string | null;
  alamat?: string | null;
  warga?: Warga[];
};

type RT = {
  id: string;
  kodeRT?: string | null;
  kodeRW?: string | null;
  namaRT?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  totalKK: number;
  totalWarga: number;

  desaAsalKK?: Record<string, number>;
  wargaDesaAsalKK?: Record<string, number>;
  pemilihDesaAsalKK?: Record<string, number>;

  jenisKelamin?: {
    lakiLaki?: number;
    perempuan?: number;
  };
  pemilihPotensial?: number;
  kks?: KK[];
};

type DashboardData = {
  success?: boolean;
  batasUsiaPemilih?: number;
  total?: {
    totalRT?: number;
    totalKK?: number;
    totalWarga?: number;
    pemilihPotensial?: number;
    lakiLaki?: number;
    perempuan?: number;
  };
  rt: RT[];
};

function Card({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-900">
        {value.toLocaleString("id-ID")}
      </div>

      <div className="mt-1 text-xs text-slate-400">
        {description}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-900">
        {title}
      </h2>

      {children}
    </section>
  );
}

export default function SuperadminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FILTER
  // =====================================================

  const [selectedRT, setSelectedRT] = useState<string[]>([]);
  const [selectedDesa, setSelectedDesa] = useState<string[]>([]);
  const [selectedKK, setSelectedKK] = useState("ALL");
  const [searchKK, setSearchKK] = useState("");
  const [detailKK, setDetailKK] = useState<any | null>(null);
  const [selectedDesaAsal, setSelectedDesaAsal] = useState("ALL");

  // =====================================================
  // LOAD DATA
  // =====================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "/api/superadmin/dashboard",
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.error ||
            "Gagal mengambil dashboard."
        );
      }

      setData(json.data || json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // =====================================================
  // DATA DASAR
  // =====================================================

  const rtList = data?.rt ?? [];

  const desaList = useMemo(() => {
    return Array.from(
      new Set(
        rtList
          .map((rt) => rt.desa || "")
          .filter(
            (desa): desa is string =>
              Boolean(desa)
          )
      )
    ).sort();
  }, [rtList]);

  // =====================================================
  // FILTER RT + DESA
  // =====================================================

  const filteredRT = useMemo(() => {
    return rtList.filter((rt) => {
      const matchRT =
        selectedRT.length === 0 ||
        selectedRT.includes(rt.id);

      const matchDesa =
        selectedDesa.length === 0 ||
        selectedDesa.includes(
          rt.desa || ""
        );

      return matchRT && matchDesa;
    });
  }, [
    rtList,
    selectedRT,
    selectedDesa,
  ]);

  // =====================================================
  // DAFTAR KK SESUAI FILTER
  // =====================================================

  const kkList = useMemo(() => {
    const result: Array<
      KK & {
        rtId: string;
        kodeRT: string;
        kodeRW: string;
        desa: string;
      }
    > = [];

    filteredRT.forEach((rt) => {
      (rt.kks ?? []).forEach((kk) => {
        result.push({
          ...kk,
          rtId: rt.id,
          kodeRT: rt.kodeRT || "-",
          kodeRW: rt.kodeRW || "-",
          desa: rt.desa || "-",
        });
      });
    });

    return result;
  }, [filteredRT]);

  // =====================================================
  // RESET KK JIKA SUDAH TIDAK ADA
  // =====================================================

  useEffect(() => {
    if (
      selectedKK !== "ALL" &&
      !kkList.some(
        (kk) => kk.id === selectedKK
      )
    ) {
      setSelectedKK("ALL");
    }
  }, [kkList, selectedKK]);

  // =====================================================
  // KK TERPILIH
  // =====================================================

  const selectedKKRows = useMemo(() => {
    if (selectedKK === "ALL") {
      return kkList;
    }

    return kkList.filter(
      (kk) => kk.id === selectedKK
    );
  }, [kkList, selectedKK]);

  // =====================================================
  // PENCARIAN KK / WARGA
  // =====================================================

  const searchedKKRows = useMemo(() => {
    const q = searchKK.trim().toLowerCase();

    if (!q) {
      return selectedKKRows;
    }

    return selectedKKRows.filter((kk) => {
      const matchKK =
        String(kk.nomorKK || "").toLowerCase().includes(q) ||
        String(kk.kepalaKeluarga || "").toLowerCase().includes(q) ||
        String(kk.kodeRT || "").toLowerCase().includes(q) ||
        String(kk.desa || "").toLowerCase().includes(q);

      const matchWarga =
        (kk.warga ?? []).some((w) =>
          [
            w.nik,
            w.nama,
            w.nomorKK,
          ]
            .map((value) =>
              String(value || "").toLowerCase()
            )
            .some((value) =>
              value.includes(q)
            )
        );

      return matchKK || matchWarga;
    });
  }, [selectedKKRows, searchKK]);

  // =====================================================
  // WARGA TERPILIH
  // =====================================================

  const selectedWarga = useMemo(() => {
    return selectedKKRows.flatMap(
      (kk) => kk.warga ?? []
    );
  }, [selectedKKRows]);

  // =====================================================
  // DESA ASAL KK
  //
  // API sudah menyediakan desaAsalKK.
  // Gunakan data API untuk daftar pilihan.
  // =====================================================

  const desaAsalList = useMemo(() => {
    const result = new Set<string>();

    filteredRT.forEach((rt) => {
      Object.keys(
        rt.desaAsalKK ?? {}
      ).forEach((desa) => {
        result.add(desa);
      });
    });

    return Array.from(result).sort();
  }, [filteredRT]);

  // =====================================================
  // ANALISIS
  // =====================================================

  const analysis = useMemo(() => {
    const usia: Record<string, number> = {
      "0-5": 0,
      "6-12": 0,
      "13-17": 0,
      "18-25": 0,
      "26-40": 0,
      "41-59": 0,
      "60+": 0,
      "Tidak diketahui": 0,
    };

    const status: Record<string, number> = {};
    const agama: Record<string, number> = {};
    const pekerjaan: Record<string, number> = {};

    let lakiLaki = 0;
    let perempuan = 0;
    let pemilih = 0;

    const batas =
      data?.batasUsiaPemilih ?? 17;

    selectedWarga.forEach((w) => {
      if (
        w.jenisKelamin ===
        "LAKI_LAKI"
      ) {
        lakiLaki++;
      }

      if (
        w.jenisKelamin ===
        "PEREMPUAN"
      ) {
        perempuan++;
      }

      const age =
        w.usia == null
          ? null
          : Number(w.usia);

      let group = "Tidak diketahui";

      if (
        age !== null &&
        !Number.isNaN(age)
      ) {
        if (age <= 5) group = "0-5";
        else if (age <= 12)
          group = "6-12";
        else if (age <= 17)
          group = "13-17";
        else if (age <= 25)
          group = "18-25";
        else if (age <= 40)
          group = "26-40";
        else if (age <= 59)
          group = "41-59";
        else group = "60+";

        if (age >= batas) {
          pemilih++;
        }
      }

      usia[group]++;

      const s =
        w.statusTinggal?.trim() ||
        "Tidak diketahui";

      status[s] =
        (status[s] || 0) + 1;

      const a =
        w.agama?.trim() ||
        "Tidak diketahui";

      agama[a] =
        (agama[a] || 0) + 1;

      const p =
        w.pekerjaan?.trim() ||
        "Tidak diketahui";

      pekerjaan[p] =
        (pekerjaan[p] || 0) + 1;
    });

    return {
      totalKK:
        selectedKKRows.length,
      totalWarga:
        selectedWarga.length,
      lakiLaki,
      perempuan,
      pemilih,
      usia,
      status,
      agama,
      pekerjaan,
    };
  }, [
    selectedWarga,
    selectedKKRows,
    data?.batasUsiaPemilih,
  ]);

  // =====================================================
  // REKAP DESA ASAL KK
  // =====================================================

  const kkAsalRows = useMemo(() => {
    const result: Array<{
      desa: string;
      jumlahKK: number;
      jumlahWarga: number;
      pemilih: number;
    }> = [];

    const map = new Map<
      string,
      {
        kk: Set<string>;
        warga: number;
        pemilih: number;
      }
    >();

    const batas =
      data?.batasUsiaPemilih ?? 17;

    filteredRT.forEach((rt) => {
      Object.entries(
        rt.desaAsalKK ?? {}
      ).forEach(
        ([desa, jumlahKK]) => {
          const current =
            map.get(desa) ?? {
              kk: new Set<string>(),
              warga: 0,
              pemilih: 0,
            };

          for (
            let i = 0;
            i < Number(jumlahKK);
            i++
          ) {
            current.kk.add(
              `${rt.id}-${desa}-${i}`
            );
          }

          const wargaJumlah =
            rt.wargaDesaAsalKK?.[desa] ??
            0;

          const pemilihJumlah =
            rt.pemilihDesaAsalKK?.[desa] ??
            0;

          current.warga +=
            Number(wargaJumlah);

          current.pemilih +=
            Number(pemilihJumlah);

          map.set(
            desa,
            current
          );
        }
      );
    });

    map.forEach((value, desa) => {
      if (
        selectedDesaAsal !== "ALL" &&
        desa !== selectedDesaAsal
      ) {
        return;
      }

      result.push({
        desa,
        jumlahKK:
          value.kk.size,
        jumlahWarga:
          value.warga,
        pemilih:
          value.pemilih,
      });
    });

    return result.sort(
      (a, b) =>
        b.jumlahKK -
        a.jumlahKK
    );
  }, [
    filteredRT,
    selectedDesaAsal,
    data?.batasUsiaPemilih,
  ]);

  // =====================================================
  // EXPORT
  // =====================================================

  const exportRows = useMemo(() => {
    return selectedKKRows.flatMap(
      (kk) => {
        const warga = kk.warga ?? [];

        if (!warga.length) {
          return [
            {
              RT: kk.kodeRT,
              RW: kk.kodeRW,
              Desa: kk.desa,
              NomorKK:
                kk.nomorKK || "",
              KepalaKeluarga:
                kk.kepalaKeluarga || "",
              NIK: "",
              Nama: "",
              JenisKelamin: "",
              Hubungan: "",
              Usia: "",
              Agama: "",
              Pekerjaan: "",
              StatusTinggal: "",
              Alamat: kk.alamat || "",
            },
          ];
        }

        return warga.map((w) => ({
          RT: kk.kodeRT,
          RW: kk.kodeRW,
          Desa: kk.desa,
          NomorKK:
            kk.nomorKK || "",
          KepalaKeluarga:
            kk.kepalaKeluarga || "",
          NIK: w.nik || "",
          Nama: w.nama || "",
          JenisKelamin:
            w.jenisKelamin || "",
          Hubungan:
            w.hubunganKeluarga || "",
          Usia:
            w.usia ?? "",
          Agama:
            w.agama || "",
          Pekerjaan:
            w.pekerjaan || "",
          StatusTinggal:
            w.statusTinggal || "",
          Alamat:
            w.alamat ||
            kk.alamat ||
            "",
        }));
      }
    );
  }, [selectedKKRows]);

  const exportHeaders = [
    "RT",
    "RW",
    "Desa",
    "NomorKK",
    "KepalaKeluarga",
    "NIK",
    "Nama",
    "JenisKelamin",
    "Hubungan",
    "Usia",
    "Agama",
    "Pekerjaan",
    "StatusTinggal",
    "Alamat",
  ] as const;

  async function exportExcel() {
    const XLSX = await import("xlsx");

    /*
     * EXPORT EXCEL REKAP KK
     * 1 baris = 1 KK
     * Tidak mengulang KK berdasarkan jumlah anggota.
     */

    const excelRows = selectedKKRows.map((kk) => ({
      RT: kk.kodeRT || "-",
      RW: kk.kodeRW || "-",
      Desa: kk.desa || "-",
      "Nomor KK": kk.nomorKK || "-",
      "Kepala Keluarga":
        kk.kepalaKeluarga || "-",
      "Jumlah Warga":
        (kk.warga ?? []).length,
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(excelRows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Rekap KK"
    );

    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 22 },
      { wch: 30 },
      { wch: 15 },
    ];

    XLSX.writeFile(
      workbook,
      "rekap-kartu-keluarga.xlsx"
    );
  }
  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } =
      await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    /*
     * PDF REKAP KK
     * 1 baris = 1 KK
     * Tidak mengulang KK berdasarkan jumlah anggota.
     */

    const pdfRows = selectedKKRows.map((kk) => ({
      RT: kk.kodeRT || "-",
      RW: kk.kodeRW || "-",
      Desa: kk.desa || "-",
      NomorKK: kk.nomorKK || "-",
      KepalaKeluarga:
        kk.kepalaKeluarga || "-",
      Warga: (kk.warga ?? []).length,
    }));

    doc.setFontSize(16);
    doc.text(
      "REKAP DATA KARTU KELUARGA",
      14,
      15
    );

    doc.setFontSize(9);

    doc.text(
      `Total KK: ${pdfRows.length.toLocaleString("id-ID")}`,
      14,
      22
    );

    doc.text(
      `Total Warga: ${selectedWarga.length.toLocaleString("id-ID")}`,
      70,
      22
    );

    autoTable(doc, {
      startY: 27,

      head: [[
        "RT",
        "RW",
        "Desa",
        "Nomor KK",
        "Kepala Keluarga",
        "Jumlah Warga",
      ]],

      body: pdfRows.map((row) => [
        row.RT,
        row.RW,
        row.Desa,
        row.NomorKK,
        row.KepalaKeluarga,
        String(row.Warga),
      ]),

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fontSize: 8,
      },

      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 18 },
        2: { cellWidth: 35 },
        3: { cellWidth: 42 },
        4: { cellWidth: 65 },
        5: {
          cellWidth: 25,
          halign: "center",
        },
      },

      margin: {
        left: 8,
        right: 8,
      },

      didDrawPage: () => {
        doc.setFontSize(7);

        doc.text(
          `Halaman ${doc.getNumberOfPages()}`,
          270,
          202
        );
      },
    });

    doc.save(
      "rekap-kartu-keluarga.pdf"
    );
  }
  function printReport() {
    window.print();
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          Memuat Dashboard Multi-RT...
        </div>
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="font-black text-red-700">
            Dashboard gagal dimuat
          </div>

          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>

          <button
            onClick={loadDashboard}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  const total =
    data?.total ?? {};

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 rounded-2xl bg-blue-700 p-6 text-white shadow-sm">
          <div className="text-2xl font-black">
            Dashboard Superadmin
          </div>

          <div className="mt-1 text-sm text-blue-100">
            Statistik dan rekapitulasi seluruh RT
          </div>

          <div className="mt-3 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs font-bold">
            MULTI-RT
          </div>
        </div>

        {/* =================================================
            STATISTIK
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Total RT"
            value={
              selectedRT.length ||
              selectedDesa.length
                ? filteredRT.length
                : total.totalRT || 0
            }
            description="Sesuai filter"
          />

          <Card
            title="Total KK"
            value={analysis.totalKK}
            description="Sesuai filter"
          />

          <Card
            title="Total Warga"
            value={analysis.totalWarga}
            description="Sesuai filter"
          />

          <Card
            title="Pemilih Potensial"
            value={analysis.pemilih}
            description={`Usia ${data?.batasUsiaPemilih ?? 17}+`}
          />
        </div>

        {/* =================================================
            FILTER
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">

          <div className="mb-4">
            <div className="text-lg font-black">
              Filter Dashboard
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Dashboard → Statistik → Filter RT multi →
              Filter Desa multi → Filter KK →
              Desa Asal KK → Rekap → Analisis → Export.
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">

            {/* RT */}

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                RT
              </label>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2">

                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedRT.length === 0
                    }
                    onChange={() =>
                      setSelectedRT([])
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-bold">
                    Semua RT
                  </span>
                </label>

                {rtList.map((rt) => {
                  const checked =
                    selectedRT.includes(
                      rt.id
                    );

                  return (
                    <label
                      key={rt.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedRT(
                            (current) =>
                              current.includes(
                                rt.id
                              )
                                ? current.filter(
                                    (id) =>
                                      id !==
                                      rt.id
                                  )
                                : [
                                    ...current,
                                    rt.id,
                                  ]
                          );
                        }}
                        className="h-4 w-4"
                      />

                      <span className="text-sm">
                        RT {rt.kodeRT || "-"} /
                        RW {rt.kodeRW || "-"}
                      </span>
                    </label>
                  );
                })}

              </div>

              <div className="mt-1 text-xs text-slate-500">
                {selectedRT.length === 0
                  ? "Semua RT dipilih"
                  : `${selectedRT.length} RT dipilih`}
              </div>
            </div>

            {/* DESA */}

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Desa Wilayah RT
              </label>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2">

                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={
                      selectedDesa.length === 0
                    }
                    onChange={() =>
                      setSelectedDesa([])
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-bold">
                    Semua Desa
                  </span>
                </label>

                {desaList.map((desa) => {
                  const checked =
                    selectedDesa.includes(
                      desa
                    );

                  return (
                    <label
                      key={desa}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedDesa(
                            (current) =>
                              current.includes(
                                desa
                              )
                                ? current.filter(
                                    (item) =>
                                      item !==
                                      desa
                                  )
                                : [
                                    ...current,
                                    desa,
                                  ]
                          );
                        }}
                        className="h-4 w-4"
                      />

                      <span className="text-sm">
                        {desa}
                      </span>
                    </label>
                  );
                })}

              </div>

              <div className="mt-1 text-xs text-slate-500">
                {selectedDesa.length === 0
                  ? "Semua desa dipilih"
                  : `${selectedDesa.length} desa dipilih`}
              </div>
            </div>

            {/* KK */}

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Kartu Keluarga
              </label>

              <select
                value={selectedKK}
                onChange={(e) =>
                  setSelectedKK(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="ALL">
                  Semua KK ({kkList.length})
                </option>

                {kkList.map((kk) => (
                  <option
                    key={kk.id}
                    value={kk.id}
                  >
                    {kk.nomorKK || "-"} —{" "}
                    {kk.kepalaKeluarga || "-"}{" "}
                    (RT {kk.kodeRT})
                  </option>
                ))}
              </select>

              <div className="mt-1 text-xs text-slate-500">
                {selectedKK === "ALL"
                  ? "Semua KK dipilih"
                  : "1 KK dipilih"}
              </div>
            </div>
            {/* DESA ASAL */}

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Desa Asal KK
              </label>

              <select
                value={selectedDesaAsal}
                onChange={(e) =>
                  setSelectedDesaAsal(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="ALL">
                  Semua Desa Asal
                </option>

                {desaAsalList.map(
                  (desa) => (
                    <option
                      key={desa}
                      value={desa}
                    >
                      {desa}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>
        </div>

        {/* =================================================
            EXPORT - HANYA SATU
        ================================================= */}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">

          <div className="text-sm text-slate-500">
            Menampilkan{" "}
            <b>{analysis.totalKK}</b>{" "}
            KK dan{" "}
            <b>{analysis.totalWarga}</b>{" "}
            warga.
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={printReport}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Cetak / Print
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={exportPDF}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Export PDF
            </button>

          </div>
        </div>

        {/* =================================================
            REKAP RT
        ================================================= */}

        <div className="mt-6">
          <Section title="Rekap Data Per RT">

            <div className="max-h-[500px] overflow-auto rounded-xl">
              <table className="w-full min-w-[850px] text-sm">

                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">
                      RT / RW
                    </th>

                    <th className="px-3 py-3">
                      Desa
                    </th>

                    <th className="px-3 py-3 text-right">
                      KK
                    </th>

                    <th className="px-3 py-3 text-right">
                      Warga
                    </th>

                    <th className="px-3 py-3 text-right">
                      L
                    </th>

                    <th className="px-3 py-3 text-right">
                      P
                    </th>

                    <th className="px-3 py-3 text-right">
                      Pemilih
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRT.map((rt) => {

                    const kks =
                      selectedKK === "ALL"
                        ? rt.kks ?? []
                        : (rt.kks ?? []).filter(
                            (kk) =>
                              String(
                                kk.id
                              ) ===
                              selectedKK
                          );

                    const warga =
                      kks.flatMap(
                        (kk) =>
                          kk.warga ?? []
                      );

                    const lakiLaki =
                      warga.filter(
                        (w) =>
                          w.jenisKelamin ===
                          "LAKI_LAKI"
                      ).length;

                    const perempuan =
                      warga.filter(
                        (w) =>
                          w.jenisKelamin ===
                          "PEREMPUAN"
                      ).length;

                    const batas =
                      data?.batasUsiaPemilih ??
                      17;

                    const pemilih =
                      warga.filter(
                        (w) =>
                          w.usia != null &&
                          Number(w.usia) >=
                            batas
                      ).length;

                    return (
                      <tr
                        key={rt.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-3 font-black">
                          RT {rt.kodeRT || "-"}
                          {" / "}
                          RW {rt.kodeRW || "-"}
                        </td>

                        <td className="px-3 py-3">
                          {rt.desa || "-"}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {kks.length.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-bold">
                          {warga.length.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {lakiLaki.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {perempuan.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-black text-blue-700">
                          {pemilih.toLocaleString(
                            "id-ID"
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredRT.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Tidak ada data sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>

          </Section>
        </div>

        {/* =================================================
            DAFTAR KK
        ================================================= */}

        <div className="mt-6">
          <Section title="Daftar Kartu Keluarga">


            <div className="mb-4">
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Pencarian KK / Warga
              </label>

              <input
                type="text"
                value={searchKK}
                onChange={(e) => setSearchKK(e.target.value)}
                placeholder="Cari NIK, nama, nomor KK, kepala keluarga, RT, atau desa..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-1 text-xs text-slate-500">
                {searchKK.trim()
                  ? `${searchedKKRows.length} KK ditemukan`
                  : `${selectedKKRows.length} KK`}
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto rounded-xl">
              <table className="w-full min-w-[850px] text-sm">

                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">
                      RT
                    </th>

                    <th className="px-3 py-3">
                      Desa
                    </th>

                    <th className="px-3 py-3">
                      Nomor KK
                    </th>

                    <th className="px-3 py-3">
                      Kepala Keluarga
                    </th>

                    <th className="px-3 py-3 text-right">
                      Warga
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {searchedKKRows.map(
                    (kk) => (
                      <tr
                        key={kk.id}
                        onClick={() => setDetailKK(kk)}
                        className="cursor-pointer border-b last:border-0 hover:bg-blue-50"
                      >
                        <td className="px-3 py-3 font-bold">
                          RT {kk.kodeRT}
                        </td>

                        <td className="px-3 py-3">
                          {kk.desa}
                        </td>

                        <td className="px-3 py-3 font-mono">
                          {kk.nomorKK || "-"}
                        </td>

                        <td className="px-3 py-3 font-semibold">
                          {kk.kepalaKeluarga ||
                            "-"}
                        </td>

                        <td className="px-3 py-3 text-right font-black">
                          {(kk.warga ?? [])
                            .length}
                        </td>
                      </tr>
                    )
                  )}

                  {!searchedKKRows.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Belum ada KK sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>

          </Section>
        </div>

        {/* =================================================
            MODAL DETAIL KK
        ================================================= */}

        {detailKK && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDetailKK(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Detail Kartu Keluarga
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    RT {detailKK.kodeRT || "-"} / RW {detailKK.kodeRW || "-"}
                    {" • "}
                    {detailKK.desa || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailKK(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>

              <div className="mb-5 grid gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Nomor KK
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    {detailKK.nomorKK || "-"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Kepala Keluarga
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {detailKK.kepalaKeluarga || "-"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Jumlah Anggota
                  </div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    {(detailKK.warga ?? []).length}
                  </div>
                </div>

              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] text-sm">

                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase text-slate-500">
                      <th className="px-3 py-3">No</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Hubungan</th>
                      <th className="px-3 py-3">JK</th>
                      <th className="px-3 py-3">Usia</th>
                      <th className="px-3 py-3">Agama</th>
                      <th className="px-3 py-3">Pekerjaan</th>
                      <th className="px-3 py-3">Status Tinggal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(detailKK.warga ?? []).map(
                      (w: any, index: number) => (
                        <tr
                          key={w.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-3">
                            {index + 1}
                          </td>

                          <td className="px-3 py-3 font-mono">
                            {w.nik || "-"}
                          </td>

                          <td className="px-3 py-3 font-bold">
                            {w.nama || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.hubunganKeluarga || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.jenisKelamin || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.usia ?? "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.agama || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.pekerjaan || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {w.statusTinggal || "-"}
                          </td>
                        </tr>
                      )
                    )}

                    {!(detailKK.warga ?? []).length && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-8 text-center text-slate-400"
                        >
                          Belum ada data anggota keluarga.
                        </td>
                      </tr>
                    )}
                  </tbody>

                </table>
              </div>

            </div>
          </div>
        )}

        {/* =================================================
            ANALISIS
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <Section title="Kelompok Usia">
            <div className="space-y-2">

              {Object.entries(
                analysis.usia
              ).map(
                ([label, jumlah]) => (
                  <div
                    key={label}
                    className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span>{label}</span>

                    <b>
                      {jumlah.toLocaleString(
                        "id-ID"
                      )}
                    </b>
                  </div>
                )
              )}

            </div>
          </Section>

          <Section title="Status Tinggal">
            <div className="space-y-2">

              {Object.entries(
                analysis.status
              ).map(
                ([label, jumlah]) => (
                  <div
                    key={label}
                    className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span>{label}</span>

                    <b>
                      {jumlah.toLocaleString(
                        "id-ID"
                      )}
                    </b>
                  </div>
                )
              )}

              {!Object.keys(
                analysis.status
              ).length && (
                <div className="text-sm text-slate-400">
                  Belum ada data.
                </div>
              )}

            </div>
          </Section>

        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <Section title="Jenis Kelamin">
            <div className="space-y-2">

              <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Laki-laki</span>
                <b>
                  {analysis.lakiLaki.toLocaleString(
                    "id-ID"
                  )}
                </b>
              </div>

              <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Perempuan</span>
                <b>
                  {analysis.perempuan.toLocaleString(
                    "id-ID"
                  )}
                </b>
              </div>

            </div>
          </Section>

          <Section title="Pemilih Potensial">
            <div className="rounded-xl bg-blue-50 p-5 text-center">
              <div className="text-4xl font-black text-blue-700">
                {analysis.pemilih.toLocaleString(
                  "id-ID"
                )}
              </div>

              <div className="mt-1 text-sm text-blue-700">
                Usia{" "}
                {data?.batasUsiaPemilih ??
                  17}{" "}
                tahun ke atas
              </div>
            </div>
          </Section>

        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <Section title="Agama">
            <div className="space-y-2">

              {Object.entries(
                analysis.agama
              ).map(
                ([label, jumlah]) => (
                  <div
                    key={label}
                    className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span>{label}</span>

                    <b>
                      {jumlah.toLocaleString(
                        "id-ID"
                      )}
                    </b>
                  </div>
                )
              )}

            </div>
          </Section>

          <Section title="Pekerjaan">
            <div className="space-y-2">

              {Object.entries(
                analysis.pekerjaan
              ).map(
                ([label, jumlah]) => (
                  <div
                    key={label}
                    className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span>{label}</span>

                    <b>
                      {jumlah.toLocaleString(
                        "id-ID"
                      )}
                    </b>
                  </div>
                )
              )}

            </div>
          </Section>

        </div>

        {/* =================================================
            DESA ASAL KK
        ================================================= */}

        <div className="mt-6">

          <Section title="Desa Asal KK">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[650px] text-sm">

                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">

                    <th className="px-3 py-3">
                      Desa Asal
                    </th>

                    <th className="px-3 py-3 text-right">
                      KK
                    </th>

                    <th className="px-3 py-3 text-right">
                      Warga
                    </th>

                    <th className="px-3 py-3 text-right">
                      Pemilih
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {kkAsalRows.map(
                    (item) => (
                      <tr
                        key={item.desa}
                        className="border-b last:border-0"
                      >

                        <td className="px-3 py-3 font-semibold">
                          {item.desa}
                        </td>

                        <td className="px-3 py-3 text-right font-black">
                          {item.jumlahKK.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {item.jumlahWarga.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-black text-blue-700">
                          {item.pemilih.toLocaleString(
                            "id-ID"
                          )}
                        </td>

                      </tr>
                    )
                  )}

                  {!kkAsalRows.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Belum ada data desa asal KK.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </Section>

        </div>

      </div>
    </main>
  );
}




















