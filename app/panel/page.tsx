"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { permissions, roleLabels, type Role } from "../lib/auth";
import AppName from "../ui/app-name";
import RtInfo from "../ui/rt-info";

type Report = {
  warga: {
    totalKK: number;
    totalWarga: number;
    kelompokUsia: {
      balita: number;
      anak5_9: number;
      anak10_14: number;
      remaja15_19: number;
      dewasa20_59: number;
      lansia: number;
    };
  };

  iuran: {
    totalKKWajib: number;
    lunas: number;
    belumBayar: number;
    penerimaan: number;
    tagihan: number;
  };

  kas: {
    tersedia: boolean;
    transaksi: number;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  };

  danaTaktis: {
    transaksi: number;
    masuk: number;
    keluar: number;
    saldo: number;
  };
};

type Kegiatan = {
  id: string;
  nama: string;
  tanggal: string;
  jam: string | null;
  lokasi: string | null;
  keterangan: string | null;
  aktif: boolean;
};

const menus = [
  ["\u{1F3E0}", "Data KK", "kk", "/panel/kk"],
  ["\u{1F465}", "Data Warga", "warga", "/panel/warga"],
  ["\u{1F382}", "Kelompok Usia", "usia", "/panel/kelompok-usia"],
  ["\u{1F4B0}", "Kas RT", "kas", "/panel/kas"],
  ["\u{1F6E1}", "Dana Taktis", "taktis", "/panel/dana-taktis"],
  ["\u{1F9FE}", "Iuran & QRIS", "iuran", "/panel/iuran"],
  ["\u{1F4E2}", "Pengumuman", "pengumuman", "/panel/pengumuman"],
  ["\u{1F4C5}", "Kegiatan RT", "kegiatan", "/panel/kegiatan"],
  ["\u{1F4CA}", "Laporan", "laporan", "/panel/laporan"],
  ["\u{2699}", "Pengaturan", "pengaturan", "/panel/pengaturan"],
] as const;

const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const num = (n: number) =>
  new Intl.NumberFormat("id-ID").format(n);

export default function Panel() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [kegiatanLoading, setKegiatanLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("rt_role") as Role | null;

    if (!saved || !roleLabels[saved]) {
      router.replace("/login");
      return;
    }

    setRole(saved);
    setUsername(
      localStorage.getItem("rt_username") || ""
    );

    loadReport();
    loadKegiatan();
  }, [router]);

  async function loadKegiatan() {
    setKegiatanLoading(true);

    try {
      const response = await fetch("/api/kegiatan", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal mengambil kegiatan."
        );
      }

      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const upcoming = (data.kegiatan || [])
        .filter((item: Kegiatan) => {
          if (!item.aktif) return false;

          const date = new Date(item.tanggal);
          return date >= today;
        })
        .sort(
          (a: Kegiatan, b: Kegiatan) =>
            new Date(a.tanggal).getTime() -
            new Date(b.tanggal).getTime()
        )
        .slice(0, 3);

      setKegiatan(upcoming);
    } catch (error) {
      console.error(
        "DASHBOARD_KEGIATAN_ERROR:",
        error
      );
      setKegiatan([]);
    } finally {
      setKegiatanLoading(false);
    }
  }

  async function loadReport() {
    setReportLoading(true);

    try {
      const periode = new Date()
        .toISOString()
        .slice(0, 7);

      const response = await fetch(
        `/api/laporan?periode=${periode}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gagal mengambil data dashboard."
        );
      }

      setReport(data);
    } catch (error) {
      console.error("DASHBOARD_REPORT_ERROR:", error);
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  function openMenu(key: string, href: string) {
    if (!role) return;

    const allowed = permissions[role];

    if (!allowed.includes(key)) {
      alert(
        "Anda tidak memiliki hak akses untuk menu ini."
      );
      return;
    }

    if (href) {
      router.push(href);
      return;
    }

    alert(`${key} belum tersedia.`);
  }

  function logout() {
    localStorage.removeItem("rt_role");
    localStorage.removeItem("rt_username");
    router.replace("/");
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        Memuat...
      </div>
    );
  }

  const allowed = permissions[role];

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}
     {/* HEADER */}
<header className="bg-blue-700 text-white">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
    <div>
      <div className="text-xl font-black">
  <AppName />
</div>

<div className="mt-1 text-sm font-semibold text-blue-100">
  <RtInfo mode="wilayah" />
</div>

<div className="mt-0.5 text-xs text-blue-200">
  Panel Pengguna
</div>
    </div>
  </div>
</header>


      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* USER */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">
            Login sebagai
          </div>

          <div className="mt-1 text-xl font-black">
            {roleLabels[role]}
          </div>

          <div className="text-sm text-slate-500">
            @{username}
          </div>
        </div>

        {/* RINGKASAN REALTIME */}
        <section className="mb-7">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black">
                Ringkasan RT
              </h2>

              <p className="text-sm text-slate-500">
                Data realtime dari database.
              </p>
            </div>

            <button
              onClick={loadReport}
              className="rounded-xl border bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              Refresh
            </button>
          </div>

          {reportLoading ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">
              Memuat statistik...
            </div>
          ) : !report ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
              Data statistik belum dapat dimuat.
              <button
                onClick={loadReport}
                className="ml-2 font-bold underline"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

              {/* WARGA */}
              <button
                onClick={() => openMenu("warga", "/panel/warga")}
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{"\u{1F465}"}
                  </div>

                  <span className="text-xs font-bold text-emerald-600">
                    REALTIME
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Total Warga
                </div>

                <div className="mt-1 text-xl font-black">
                  {num(report.warga.totalWarga)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {num(report.warga.totalKK)} Kepala Keluarga
                </div>
              </button>

              {/* KELOMPOK USIA */}
              <button
                onClick={() =>
                  openMenu(
                    "usia",
                    "/panel/kelompok-usia"
                  )
                }
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{"\u{1F4CA}"}
                  </div>

                  <span className="text-xs font-bold text-emerald-600">
                    REALTIME
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Kelompok Usia
                </div>

                <div className="mt-1 text-xl font-black">
                  {num(report.warga.totalWarga)}
                </div>

                <div className="mt-2 text-[10px] leading-4 text-slate-500">
                  Balita {num(report.warga.kelompokUsia.balita)}
                  {" - "}
                  Anak {num(
                    report.warga.kelompokUsia.anak5_9 +
                    report.warga.kelompokUsia.anak10_14
                  )}
                  {" - "}
                  Remaja {num(
                    report.warga.kelompokUsia.remaja15_19
                  )}
                  {" - "}
                  Dewasa {num(
                    report.warga.kelompokUsia.dewasa20_59
                  )}
                  {" - "}
                  Lansia {num(
                    report.warga.kelompokUsia.lansia
                  )}
                </div>
              </button>

              {/* KAS */}
              <button
                onClick={() => openMenu("kas", "/panel/kas")}
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{"\u{1F4B0}"}
                  </div>

                  <span className="text-xs font-bold text-emerald-600">
                    REALTIME
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Saldo Kas RT
                </div>

                <div className="mt-1 text-xl font-black">
                  {rp(report.kas.saldo)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {num(report.kas.transaksi)} transaksi
                </div>
              </button>

              {/* DANA TAKTIS */}
              <button
                onClick={() =>
                  openMenu(
                    "taktis",
                    "/panel/dana-taktis"
                  )
                }
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{"\u{1F6E1}\u{FE0F}"}
                  </div>

                  <span className="text-xs font-bold text-emerald-600">
                    REALTIME
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Dana Taktis
                </div>

                <div className="mt-1 text-xl font-black">
                  {rp(report.danaTaktis.saldo)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {num(report.danaTaktis.transaksi)} transaksi
                </div>
              </button>

              {/* IURAN */}
              <button
                onClick={() =>
                  openMenu("iuran", "/panel/iuran")
                }
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{"\u{1F4F1}"}
                  </div>

                  <span className="text-xs font-bold text-emerald-600">
                    REALTIME
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Iuran {new Date().toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <div className="mt-1 text-xl font-black">
                  {num(report.iuran.lunas)} /{" "}
                  {num(report.iuran.totalKKWajib)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Lunas -{" "}
                  {num(report.iuran.belumBayar)} belum bayar
                </div>
              </button>

            </div>
          )}
        </section>

        {/* KEGIATAN & IURAN */}
        <section className="mb-7 grid gap-4 md:grid-cols-2">

          {/* KEGIATAN TERDEKAT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-black">
                  Kegiatan Terdekat
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Agenda <RtInfo mode="short" />
                </p>
              </div>

              <button
                onClick={() => router.push("/panel/kegiatan")}
                className="text-xs font-bold text-blue-600"
              >
                Lihat semua {"->"}
              </button>
            </div>

            {kegiatanLoading ? (
              <div className="mt-5 text-sm text-slate-400">
                Memuat kegiatan...
              </div>
            ) : kegiatan.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                Belum ada kegiatan terdekat.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {kegiatan.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="font-bold">
                      {item.nama}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Tanggal{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(item.tanggal))}
                      {item.jam && ` - ${item.jam}`}
                    </div>

                    {item.lokasi && (
                      <div className="mt-1 text-xs text-slate-500">
                        Lokasi {item.lokasi}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RINGKASAN IURAN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-black">
                  Status Iuran
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Periode berjalan
                </p>
              </div>

              <button
                onClick={() => router.push("/panel/iuran")}
                className="text-xs font-bold text-blue-600"
              >
                Kelola {"->"}
              </button>
            </div>

            {report ? (
              <div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-xs text-slate-500">
                    Lunas
                  </div>
                  <div className="mt-1 text-xl font-black text-emerald-700">
                    {num(report.iuran.lunas)}
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <div className="text-xs text-slate-500">
                    Belum
                  </div>
                  <div className="mt-1 text-xl font-black text-amber-700">
                    {num(report.iuran.belumBayar)}
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-center">
                  <div className="text-xs text-slate-500">
                    KK
                  </div>
                  <div className="mt-1 text-xl font-black text-blue-700">
                    {num(report.iuran.totalKKWajib)}
                  </div>
                </div>
                </div>

                <div className="mt-3 rounded-xl bg-red-50 p-3 text-center">
                <div className="text-xs text-slate-500">
                  Total Tunggakan
                </div>
                <div className="mt-1 text-xl font-black text-red-700">
                  {rp(report.iuran.tagihan)}
                </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-slate-400">
                Data iuran belum tersedia.
              </div>
            )}
          </div>

        </section>

        {/* MENU */}
        <h1 className="text-xl font-black">
          Menu Anda
        </h1>

        <p className="mb-4 text-sm text-slate-500">
          Menu terkunci tidak dapat diakses oleh role ini.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">

          {menus.map(
            ([icon, title, key, href]) => {
              const canOpen =
                allowed.includes(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    openMenu(key, href)
                  }
                  className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                    canOpen
                      ? "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
                      : "cursor-not-allowed border-slate-100 opacity-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                      {icon}
                    </div>

                    <span>
                      {canOpen ? "OK" : "[LOCK]"}
                    </span>
                  </div>

                  <div className="mt-3 text-sm font-bold">
                    {title}
                  </div>

                  {canOpen && href && (
                    <div className="mt-2 text-[11px] font-bold text-blue-600">
                      Buka {"->"}
                    </div>
                  )}
                </button>
              );
            }
          )}

        </div>

      </div>
    </main>
  );
}













