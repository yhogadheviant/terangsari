"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabels, type Role } from "../lib/auth";
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

type Menu = {
  icon: string;
  title: string;
  key: string;
  href: string;
  description: string;
};

const menus: Menu[] = [
  {
    icon: "🏠",
    title: "Data KK",
    key: "kk",
    href: "/panel/kk",
    description: "Kelola kartu keluarga",
  },
  {
    icon: "👥",
    title: "Data Warga",
    key: "warga",
    href: "/panel/warga",
    description: "Data penduduk RT",
  },
  {
    icon: "🎂",
    title: "Kelompok Usia",
    key: "usia",
    href: "/panel/kelompok-usia",
    description: "Statistik kelompok usia",
  },
  {
    icon: "💰",
    title: "Kas RT",
    key: "kas",
    href: "/panel/kas",
    description: "Keuangan kas RT",
  },
  {
    icon: "🛡️",
    title: "Dana Taktis",
    key: "taktis",
    href: "/panel/dana-taktis",
    description: "Dana operasional taktis",
  },
  {
    icon: "🧾",
    title: "Iuran & QRIS",
    key: "iuran",
    href: "/panel/iuran",
    description: "Tagihan dan pembayaran",
  },
  {
    icon: "📢",
    title: "Pengumuman",
    key: "pengumuman",
    href: "/panel/pengumuman",
    description: "Informasi untuk warga",
  },
  {
    icon: "📅",
    title: "Kegiatan RT",
    key: "kegiatan",
    href: "/panel/kegiatan",
    description: "Agenda dan kegiatan",
  },
  {
    icon: "📊",
    title: "Laporan",
    key: "laporan",
    href: "/panel/laporan",
    description: "Laporan administrasi RT",
  },
  {
    icon: "⚙️",
    title: "Pengaturan",
    key: "pengaturan",
    href: "/panel/pengaturan",
    description: "Pengaturan sistem",
  },
];

const permissionMap: Record<string, string> = {
  kk: "KK_VIEW",
  warga: "WARGA_VIEW",
  usia: "WARGA_VIEW",
  kas: "KAS_VIEW",
  taktis: "DANA_TAKTIS_VIEW",
  iuran: "IURAN_VIEW",
  pengumuman: "PENGUMUMAN_VIEW",
  kegiatan: "KEGIATAN_VIEW",
  laporan: "LAPORAN_VIEW",
  pengaturan: "PENGATURAN_VIEW",
};

const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const num = (n: number) =>
  new Intl.NumberFormat("id-ID").format(n);

function formatTanggal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHari(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";

  return "Selamat malam";
}

export default function Panel() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [kegiatanLoading, setKegiatanLoading] = useState(true);

  const [allowed, setAllowed] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rt_role") as Role | null;

    if (!saved || !roleLabels[saved]) {
      router.replace("/login");
      return;
    }

    if (saved === "superadmin") {
      router.replace("/panel/superadmin");
      return;
    }

    setRole(saved);
    setUsername(localStorage.getItem("rt_username") || "");

    loadMenuPermissions();
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
          data.error ||
            "Gagal mengambil data dashboard."
        );
      }

      setReport(data);
    } catch (error) {
      console.error(
        "DASHBOARD_REPORT_ERROR:",
        error
      );

      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  async function loadMenuPermissions() {
    try {
      const results = await Promise.all(
        Object.entries(permissionMap).map(
          async ([key, permissionCode]) => {
            const response = await fetch(
              `/api/auth/permission?code=${encodeURIComponent(
                permissionCode
              )}`,
              {
                cache: "no-store",
              }
            );

            if (!response.ok) return null;

            const data = await response.json();

            return data?.allowed ? key : null;
          }
        )
      );

      setAllowed(
        results.filter(
          (key): key is string =>
            key !== null
        )
      );
    } catch (error) {
      console.error(
        "MENU_PERMISSION_LOAD_ERROR:",
        error
      );

      setAllowed([]);
    }
  }

  async function openMenu(
    key: string,
    href: string
  ) {
    if (!role) return;

    const permissionCode =
      permissionMap[key];

    if (!permissionCode) {
      alert(`${key} belum tersedia.`);
      return;
    }

    try {
      const response = await fetch(
        `/api/auth/permission?code=${encodeURIComponent(
          permissionCode
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data?.allowed
      ) {
        alert(
          "Anda tidak memiliki hak akses untuk menu ini."
        );
        return;
      }

      router.push(href);
    } catch (error) {
      console.error(
        "MENU_ACCESS_ERROR:",
        error
      );

      alert(
        "Gagal memeriksa hak akses."
      );
    }
  }

  async function refreshDashboard() {
    setRefreshing(true);

    try {
      await Promise.all([
        loadReport(),
        loadKegiatan(),
        loadMenuPermissions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  function logout() {
    localStorage.removeItem("rt_role");
    localStorage.removeItem("rt_username");

    router.replace("/");
  }

  const iuranProgress = useMemo(() => {
    if (!report?.iuran.totalKKWajib) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (report.iuran.lunas /
          report.iuran.totalKKWajib) *
          100
      )
    );
  }, [report]);

  const quickMenus = useMemo<Menu[]>(() => {
  const priority = [
    "warga",
    "kk",
    "iuran",
    "kas",
    "kegiatan",
    "laporan",
  ];

  const result: Menu[] = [];

  for (const key of priority) {
    const menu = menus.find(
      (item) => item.key === key
    );

    if (!menu) continue;
    if (!allowed.includes(menu.key)) continue;

    result.push(menu);
  }

  return result;
}, [allowed]);

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">
            Memuat dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 md:pl-72">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
        {/* HEADER / WELCOME */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-900/10 sm:p-7">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
                <span className="rounded-full bg-white/15 px-3 py-1">
                  Dashboard RT
                </span>
                <span className="hidden sm:inline">
                  •
                </span>
                <span className="hidden sm:inline">
                  {getGreeting()}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {getGreeting()},{" "}
                {username || "Pengguna"} 👋
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-blue-100">
                <AppName />
                <span className="hidden sm:inline">
                  •
                </span>
                <RtInfo />
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">
                Kelola data warga, administrasi,
                keuangan, kegiatan, dan laporan RT
                dari satu dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm sm:block">
                <div className="text-xs text-blue-100">
                  Akses saat ini
                </div>
                <div className="mt-1 font-semibold">
                  {roleLabels[role]}
                </div>
              </div>

              <button
                type="button"
                onClick={refreshDashboard}
                disabled={refreshing}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Memuat..."
                  : "↻ Refresh"}
              </button>
            </div>
          </div>
        </section>

        {/* STATISTIK UTAMA */}
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ringkasan RT
              </h2>
              <p className="text-sm text-slate-500">
                Kondisi data dan keuangan bulan
                berjalan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* WARGA */}
            <button
              type="button"
              onClick={() =>
                openMenu(
                  "warga",
                  "/panel/warga"
                )
              }
              disabled={
                !allowed.includes("warga")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  👥
                </div>
                {allowed.includes(
                  "warga"
                ) && (
                  <span className="text-xs text-slate-400 transition group-hover:text-blue-600">
                    →
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Total Warga
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {reportLoading
                  ? "—"
                  : num(
                      report?.warga
                        .totalWarga || 0
                    )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {reportLoading
                  ? "Memuat data..."
                  : `${num(
                      report?.warga
                        .totalKK || 0
                    )} KK terdata`}
              </p>
            </button>

            {/* KK */}
            <button
              type="button"
              onClick={() =>
                openMenu(
                  "kk",
                  "/panel/kk"
                )
              }
              disabled={
                !allowed.includes("kk")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                  🏠
                </div>
                {allowed.includes(
                  "kk"
                ) && (
                  <span className="text-xs text-slate-400 transition group-hover:text-indigo-600">
                    →
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Kartu Keluarga
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {reportLoading
                  ? "—"
                  : num(
                      report?.warga
                        .totalKK || 0
                    )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Data keluarga aktif
              </p>
            </button>

            {/* KAS */}
            <button
              type="button"
              onClick={() =>
                openMenu(
                  "kas",
                  "/panel/kas"
                )
              }
              disabled={
                !allowed.includes("kas")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                  💰
                </div>
                {allowed.includes(
                  "kas"
                ) && (
                  <span className="text-xs text-slate-400 transition group-hover:text-emerald-600">
                    →
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Saldo Kas
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {reportLoading
                  ? "—"
                  : rp(
                      report?.kas
                        .saldo || 0
                    )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {report?.kas
                  .tersedia
                  ? `${num(
                      report.kas
                        .transaksi
                    )} transaksi`
                  : "Belum tersedia"}
              </p>
            </button>

            {/* IURAN */}
            <button
              type="button"
              onClick={() =>
                openMenu(
                  "iuran",
                  "/panel/iuran"
                )
              }
              disabled={
                !allowed.includes(
                  "iuran"
                )
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                  🧾
                </div>
                {allowed.includes(
                  "iuran"
                ) && (
                  <span className="text-xs text-slate-400 transition group-hover:text-amber-600">
                    →
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Iuran Lunas
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {reportLoading
                  ? "—"
                  : `${iuranProgress}%`}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {reportLoading
                  ? "Memuat data..."
                  : `${num(
                      report?.iuran
                        .lunas || 0
                    )} dari ${num(
                      report?.iuran
                        .totalKKWajib ||
                        0
                    )} KK`}
              </p>
            </button>

            {/* DANA TAKTIS */}
            <button
              type="button"
              onClick={() =>
                openMenu(
                  "taktis",
                  "/panel/dana-taktis"
                )
              }
              disabled={
                !allowed.includes(
                  "taktis"
                )
              }
              className="group col-span-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm lg:col-span-1"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">
                  🛡️
                </div>
                {allowed.includes(
                  "taktis"
                ) && (
                  <span className="text-xs text-slate-400 transition group-hover:text-violet-600">
                    →
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Dana Taktis
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {reportLoading
                  ? "—"
                  : rp(
                      report?.danaTaktis
                        .saldo || 0
                    )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Dana tersedia
              </p>
            </button>
          </div>
        </section>

        {/* IURAN + KEUANGAN */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                    🧾
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Status Iuran
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rekap bulan berjalan
                    </p>
                  </div>
                </div>
              </div>

              {allowed.includes(
                "iuran"
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    openMenu(
                      "iuran",
                      "/panel/iuran"
                    )
                  }
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Lihat detail →
                </button>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {reportLoading
                      ? "—"
                      : `${iuranProgress}%`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tingkat pembayaran
                  </p>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {reportLoading
                    ? "—"
                    : `${num(
                        report?.iuran
                          .lunas || 0
                      )}/${num(
                        report?.iuran
                          .totalKKWajib ||
                          0
                      )} KK`}
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{
                    width: `${iuranProgress}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Wajib
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {reportLoading
                      ? "—"
                      : num(
                          report?.iuran
                            .totalKKWajib ||
                            0
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">
                    Lunas
                  </p>
                  <p className="mt-1 font-bold text-emerald-800">
                    {reportLoading
                      ? "—"
                      : num(
                          report?.iuran
                            .lunas || 0
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-xs text-rose-700">
                    Belum Bayar
                  </p>
                  <p className="mt-1 font-bold text-rose-800">
                    {reportLoading
                      ? "—"
                      : num(
                          report?.iuran
                            .belumBayar ||
                            0
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">
                    Penerimaan
                  </p>
                  <p className="mt-1 truncate font-bold text-blue-800">
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.iuran
                            .penerimaan ||
                            0
                        )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                💰
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Keuangan Kas
                </h2>
                <p className="text-xs text-slate-500">
                  Ringkasan bulan berjalan
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Saldo tersedia
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {reportLoading
                  ? "—"
                  : rp(
                      report?.kas
                        .saldo || 0
                    )}
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Pemasukan
                  </span>
                  <span className="font-semibold text-emerald-600">
                    +{" "}
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.kas
                            .pemasukan ||
                            0
                        )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Pengeluaran
                  </span>
                  <span className="font-semibold text-rose-600">
                    -{" "}
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.kas
                            .pengeluaran ||
                            0
                        )}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Transaksi
                    </span>
                    <span className="font-semibold text-slate-900">
                      {reportLoading
                        ? "—"
                        : num(
                            report?.kas
                              .transaksi ||
                              0
                          )}
                    </span>
                  </div>
                </div>
              </div>

              {allowed.includes(
                "kas"
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    openMenu(
                      "kas",
                      "/panel/kas"
                    )
                  }
                  className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Buka Kas RT
                </button>
              )}
            </div>
          </div>
        </section>

        {/* KEGIATAN + QUICK ACTION */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    📅
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Kegiatan Mendatang
                    </h2>
                    <p className="text-xs text-slate-500">
                      Agenda RT terdekat
                    </p>
                  </div>
                </div>
              </div>

              {allowed.includes(
                "kegiatan"
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    openMenu(
                      "kegiatan",
                      "/panel/kegiatan"
                    )
                  }
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Semua kegiatan →
                </button>
              )}
            </div>

            <div className="mt-5">
              {kegiatanLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-20 animate-pulse rounded-xl bg-slate-100"
                      />
                    )
                  )}
                </div>
              ) : kegiatan.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <div className="text-3xl">
                    📅
                  </div>
                  <p className="mt-3 font-semibold text-slate-700">
                    Belum ada kegiatan
                    mendatang
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Agenda yang akan datang
                    akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {kegiatan.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/40"
                      >
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white shadow-sm">
                          <span className="text-[10px] font-bold uppercase text-blue-600">
                            {new Date(
                              item.tanggal
                            ).toLocaleDateString(
                              "id-ID",
                              {
                                month:
                                  "short",
                              }
                            )}
                          </span>
                          <span className="text-xl font-bold leading-none text-slate-900">
                            {new Date(
                              item.tanggal
                            ).getDate()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-slate-900">
                            {item.nama}
                          </h3>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              {formatHari(
                                item.tanggal
                              )}
                            </span>

                            {item.jam && (
                              <span>
                                🕐{" "}
                                {item.jam}
                              </span>
                            )}

                            {item.lokasi && (
                              <span className="truncate">
                                📍{" "}
                                {
                                  item.lokasi
                                }
                              </span>
                            )}
                          </div>

                          {item.keterangan && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                              {
                                item.keterangan
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                ⚡
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Akses Cepat
                </h2>
                <p className="text-xs text-slate-500">
                  Menu yang sering digunakan
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {quickMenus.length ===
              0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Tidak ada menu tersedia.
                </div>
              ) : (
                quickMenus.map(
                  (menu) => (
                    <button
                      key={menu.key}
                      type="button"
                      onClick={() =>
                        openMenu(
                          menu.key,
                          menu.href
                        )
                      }
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-100 hover:bg-blue-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-lg group-hover:bg-white">
                        {menu.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">
                          {menu.title}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {menu.description}
                        </span>
                      </span>

                      <span className="text-slate-300 transition group-hover:text-blue-500">
                        →
                      </span>
                    </button>
                  )
                )
              )}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              💡 Gunakan menu di sidebar
              untuk mengakses seluruh fitur
              Smart RT.
            </div>
          </div>
        </section>

        {/* DANA TAKTIS */}
        {allowed.includes("taktis") && (
          <section className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">
                    🛡️
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Dana Taktis RT
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ringkasan dana operasional
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openMenu(
                      "taktis",
                      "/panel/dana-taktis"
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  Kelola Dana Taktis →
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Saldo
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.danaTaktis
                            .saldo || 0
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">
                    Dana Masuk
                  </p>
                  <p className="mt-1 font-bold text-emerald-800">
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.danaTaktis
                            .masuk || 0
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-4">
                  <p className="text-xs text-rose-700">
                    Dana Keluar
                  </p>
                  <p className="mt-1 font-bold text-rose-800">
                    {reportLoading
                      ? "—"
                      : rp(
                          report?.danaTaktis
                            .keluar || 0
                        )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SEMUA MENU */}
        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Semua Fitur
            </h2>
            <p className="text-sm text-slate-500">
              Fitur yang tersedia sesuai hak akses
              Anda
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {menus.map((menu) => {
              const isAllowed =
                allowed.includes(menu.key);

              return (
                <button
                  key={menu.key}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() =>
                    openMenu(
                      menu.key,
                      menu.href
                    )
                  }
                  className={`group rounded-2xl border p-4 text-left transition ${
                    isAllowed
                      ? "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      : "cursor-default border-slate-100 bg-slate-100/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
                        isAllowed
                          ? "bg-blue-50"
                          : "bg-slate-200"
                      }`}
                    >
                      {menu.icon}
                    </div>

                    <span className="text-xs">
                      {isAllowed
                        ? "→"
                        : "🔒"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-800">
                    {menu.title}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                    {isAllowed
                      ? menu.description
                      : "Akses terbatas"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}


