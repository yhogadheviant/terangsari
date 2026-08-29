"use client";

import { useEffect, useMemo, useState } from "react";

type RtData = {
  id: string;
  kodeRT?: string;
  kodeRW?: string;
  namaRT?: string;
  desa?: string | null;
  perumahan?: string | null;
  totalKK?: number;
  totalWarga?: number;
  jenisKelamin?: {
    lakiLaki?: number;
    perempuan?: number;
  };
  usia?: Record<string, number>;
  statusTinggal?: Record<string, number>;
  agama?: Record<string, number>;
  pekerjaan?: Record<string, number>;
  desaAsalKK?: Record<string, number>;
  wargaDesaAsalKK?: Record<string, number>;
  pemilihDesaAsalKK?: Record<string, number>;
  pemilihPotensial?: number;
};

type DashboardData = {
  success?: boolean;
  batasUsiaPemilih?: number;
  total?: {
    totalRT?: number;
    totalKK?: number;
    totalWarga?: number;
    lakiLaki?: number;
    perempuan?: number;
    pemilihPotensial?: number;
  };
  rt?: RtData[];
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

function MapList({
  data,
}: {
  data: Record<string, number>;
}) {
  const rows = Object.entries(data).sort(
    (a, b) => b[1] - a[1]
  );

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">
        Belum ada data.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(([label, jumlah]) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
        >
          <span className="font-semibold text-slate-700">
            {label}
          </span>

          <span className="font-black text-slate-900">
            {jumlah.toLocaleString("id-ID")}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SuperadminDashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRT, setSelectedRT] =
    useState("ALL");

  const [selectedDesa, setSelectedDesa] =
    useState("ALL");

  const [selectedDesaAsal, setSelectedDesaAsal] =
    useState("ALL");

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

      setData(json);
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

  const rtList = data?.rt || [];

  const desaList = useMemo(() => {
    return Array.from(
      new Set(
        rtList
          .map((x) => x.desa || "")
          .filter(Boolean)
      )
    ).sort();
  }, [rtList]);

  const filteredRT = useMemo(() => {
    return rtList.filter((rt) => {
      const matchRT =
        selectedRT === "ALL" ||
        rt.id === selectedRT;

      const matchDesa =
        selectedDesa === "ALL" ||
        (rt.desa || "") === selectedDesa;

      return matchRT && matchDesa;
    });
  }, [
    rtList,
    selectedRT,
    selectedDesa,
  ]);

  const desaAsalList = useMemo(() => {
    const values = new Set<string>();

    filteredRT.forEach((rt) => {
      Object.keys(rt.desaAsalKK || {}).forEach(
        (desa) => values.add(desa)
      );
    });

    return Array.from(values).sort();
  }, [filteredRT]);

  const kkAsalRows = useMemo(() => {
    const result: Array<{
      rt: string;
      rw: string;
      desaWilayah: string;
      desaAsal: string;
      jumlahKK: number;
      jumlahWarga: number;
      pemilih: number;
    }> = [];

    filteredRT.forEach((rt) => {
      const dataKK = rt.desaAsalKK || {};
      const dataWarga = rt.wargaDesaAsalKK || {};
      const dataPemilih = rt.pemilihDesaAsalKK || {};

      Object.entries(dataKK).forEach(
        ([desaAsal, jumlahKK]) => {

          if (
            selectedDesaAsal !== "ALL" &&
            desaAsal !== selectedDesaAsal
          ) {
            return;
          }

          result.push({
            rt: rt.kodeRT || "-",
            rw: rt.kodeRW || "-",
            desaWilayah: rt.desa || "-",
            desaAsal,
            jumlahKK,
            jumlahWarga: dataWarga[desaAsal] || 0,
            pemilih: dataPemilih[desaAsal] || 0,
          });
        }
      );
    });

    return result;
  }, [
    filteredRT,
    selectedDesaAsal,
  ]);

  const filteredSummary = useMemo(() => {
    return filteredRT.reduce(
      (acc, rt) => {
        acc.totalKK += rt.totalKK || 0;
        acc.totalWarga += rt.totalWarga || 0;

        acc.lakiLaki +=
          rt.jenisKelamin?.lakiLaki || 0;

        acc.perempuan +=
          rt.jenisKelamin?.perempuan || 0;

        acc.pemilih +=
          rt.pemilihPotensial || 0;

        return acc;
      },
      {
        totalKK: 0,
        totalWarga: 0,
        lakiLaki: 0,
        perempuan: 0,
        pemilih: 0,
      }
    );
  }, [filteredRT]);

  const filteredAge = useMemo(() => {
    const result: Record<string, number> = {};

    filteredRT.forEach((rt) => {
      Object.entries(rt.usia || {}).forEach(
        ([label, jumlah]) => {
          result[label] =
            (result[label] || 0) + jumlah;
        }
      );
    });

    return result;
  }, [filteredRT]);

  const filteredStatus = useMemo(() => {
    const result: Record<string, number> = {};

    filteredRT.forEach((rt) => {
      Object.entries(
        rt.statusTinggal || {}
      ).forEach(([label, jumlah]) => {
        result[label] =
          (result[label] || 0) + jumlah;
      });
    });

    return result;
  }, [filteredRT]);

  const filteredAgama = useMemo(() => {
    const result: Record<string, number> = {};

    filteredRT.forEach((rt) => {
      Object.entries(rt.agama || {}).forEach(
        ([label, jumlah]) => {
          result[label] =
            (result[label] || 0) + jumlah;
        }
      );
    });

    return result;
  }, [filteredRT]);

  const filteredPekerjaan = useMemo(() => {
    const result: Record<string, number> = {};

    filteredRT.forEach((rt) => {
      Object.entries(
        rt.pekerjaan || {}
      ).forEach(([label, jumlah]) => {
        result[label] =
          (result[label] || 0) + jumlah;
      });
    });

    return result;
  }, [filteredRT]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            Memuat Dashboard Multi-RT...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
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
        </div>
      </main>
    );
  }

  const total = data?.total || {};

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 rounded-2xl bg-blue-700 p-6 text-white shadow-sm">
          <div className="text-2xl font-black">
            Dashboard Multi-RT
          </div>

          <div className="mt-1 text-sm text-blue-100">
            Rekapitulasi data KK dan warga seluruh RT
          </div>

          <div className="mt-3 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs font-bold">
            KHUSUS SUPERADMIN
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Total RT"
            value={
              selectedRT === "ALL" &&
              selectedDesa === "ALL"
                ? total.totalRT || 0
                : filteredRT.length
            }
            description="RT yang ditampilkan"
          />

          <Card
            title="Total KK"
            value={
              selectedRT === "ALL" &&
              selectedDesa === "ALL"
                ? total.totalKK || 0
                : filteredSummary.totalKK
            }
            description="Kartu keluarga"
          />

          <Card
            title="Total Warga"
            value={
              selectedRT === "ALL" &&
              selectedDesa === "ALL"
                ? total.totalWarga || 0
                : filteredSummary.totalWarga
            }
            description="Seluruh warga"
          />

          <Card
            title="Pemilih Potensial"
            value={
              selectedRT === "ALL" &&
              selectedDesa === "ALL"
                ? total.pemilihPotensial || 0
                : filteredSummary.pemilih
            }
            description={`Usia ${data?.batasUsiaPemilih || 17} tahun ke atas`}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-black">
            Filter Dashboard
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                RT
              </label>

              <select
                value={selectedRT}
                onChange={(e) =>
                  setSelectedRT(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="ALL">
                  Semua RT
                </option>

                {rtList.map((rt) => (
                  <option
                    key={rt.id}
                    value={rt.id}
                  >
                    RT {rt.kodeRT || "-"} / RW{" "}
                    {rt.kodeRW || "-"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Desa Wilayah RT
              </label>

              <select
                value={selectedDesa}
                onChange={(e) =>
                  setSelectedDesa(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="ALL">
                  Semua Desa
                </option>

                {desaList.map((desa) => (
                  <option
                    key={desa}
                    value={desa}
                  >
                    {desa}
                  </option>
                ))}
              </select>
            </div>

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

                {desaAsalList.map((desa) => (
                  <option
                    key={desa}
                    value={desa}
                  >
                    {desa}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        <div className="mt-6">
          <Section title="Rekap Data Per RT">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">RT</th>
                    <th className="px-3 py-3">Desa</th>
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
                  {filteredRT.map((rt) => (
                    <tr
                      key={rt.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3 font-black">
                        RT {rt.kodeRT || "-"}
                      </td>

                      <td className="px-3 py-3">
                        {rt.desa || "-"}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {(rt.totalKK || 0).toLocaleString(
                          "id-ID"
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {(rt.totalWarga || 0).toLocaleString(
                          "id-ID"
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {(
                          rt.jenisKelamin?.lakiLaki ||
                          0
                        ).toLocaleString("id-ID")}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {(
                          rt.jenisKelamin?.perempuan ||
                          0
                        ).toLocaleString("id-ID")}
                      </td>

                      <td className="px-3 py-3 text-right font-black text-blue-700">
                        {(
                          rt.pemilihPotensial || 0
                        ).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <Section title="Kelompok Usia">
            <MapList data={filteredAge} />

            <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              Batas pemilih potensial:
              <strong className="ml-1">
                {data?.batasUsiaPemilih || 17} tahun
              </strong>
            </div>
          </Section>

          <Section title="Status Tinggal">
            <MapList data={filteredStatus} />
          </Section>

        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <Section title="Agama">
            <MapList data={filteredAgama} />
          </Section>

          <Section title="Pekerjaan">
            <MapList data={filteredPekerjaan} />
          </Section>

        </div>

        <div className="mt-6">
          <Section title="KK Asal Per RT Berdasarkan Desa">

            <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              Data KK asal dikelompokkan berdasarkan
              desa asal dan tetap ditampilkan
              <strong> per RT</strong>.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">
                      RT
                    </th>

                    <th className="px-3 py-3">
                      Desa Wilayah
                    </th>

                    <th className="px-3 py-3">
                      Desa Asal KK
                    </th>

                    <th className="px-3 py-3 text-right">
                      Jumlah KK
                    </th>

                    <th className="px-3 py-3 text-right">
                      Pemilih Potensial
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {kkAsalRows.map(
                    (item, index) => (
                      <tr
                        key={`${item.rt}-${item.desaAsal}-${index}`}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-3 font-black">
                          RT {item.rt} / RW{" "}
                          {item.rw}
                        </td>

                        <td className="px-3 py-3">
                          {item.desaWilayah}
                        </td>

                        <td className="px-3 py-3 font-semibold">
                          {item.desaAsal}
                        </td>

                        <td className="px-3 py-3 text-right font-black">
                          {item.jumlahKK.toLocaleString(
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

                  {kkAsalRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Belum ada data KK asal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </Section>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">
            Data yang sedang ditampilkan
          </div>

          <div className="mt-2 text-lg font-black text-slate-900">
            {filteredRT.length} RT
            <span className="mx-2 text-slate-300">
              |
            </span>
            {filteredSummary.totalKK.toLocaleString(
              "id-ID"
            )} KK
            <span className="mx-2 text-slate-300">
              |
            </span>
            {filteredSummary.totalWarga.toLocaleString(
              "id-ID"
            )} warga
            <span className="mx-2 text-slate-300">
              |
            </span>
            {filteredSummary.pemilih.toLocaleString(
              "id-ID"
            )} pemilih
          </div>
        </div>

      </div>
    </main>
  );
}


