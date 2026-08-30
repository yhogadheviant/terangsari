"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FileBarChart,
  Home,
  Landmark,
  LockKeyhole,
  LogIn,
  Megaphone,
  Shield,
  Users,
  Wallet,
  ContactRound,
  BarChart3,
  Settings,
} from "lucide-react";
import AppName from "./app-name";
import RtInfo from "./rt-info";

const menu = [
  {
    icon: ContactRound,
    title: "Data KK",
    description: "Data kartu keluarga",
    href: "/panel/kk",
    private: true,
  },
  {
    icon: Users,
    title: "Data Warga",
    description: "Data warga RT",
    href: "/panel/warga",
    private: true,
  },
  {
    icon: BarChart3,
    title: "Kelompok Usia",
    description: "Kelompok & statistik usia warga",
    href: "/panel/kelompok-usia",
    private: true,
  },
  {
    icon: Landmark,
    title: "Kas RT",
    description: "Pemasukan & pengeluaran RT",
    href: "/panel/kas",
    private: true,
  },
  {
    icon: Shield,
    title: "Dana Taktis",
    description: "Pembukuan dana taktis",
    href: "/panel/dana-taktis",
    private: true,
  },
  {
    icon: Wallet,
    title: "Iuran & QRIS",
    description: "Iuran warga & pembayaran",
    href: "/panel/iuran",
    private: true,
  },
  {
    icon: Megaphone,
    title: "Pengumuman",
    description: "Informasi warga",
    href: "/panel/pengumuman",
    private: false,
  },
  {
    icon: CalendarDays,
    title: "Kegiatan RT",
    description: "Agenda & kegiatan warga",
    href: "/panel/kegiatan",
    private: false,
  },
  {
    icon: FileBarChart,
    title: "Laporan",
    description: "Laporan administrasi RT",
    href: "/panel/laporan",
    private: true,
  },
  {
    icon: Settings,
    title: "Pengaturan",
    description: "Pengaturan sistem",
    href: "/panel/pengaturan",
    private: true,
  },
];

export default function Dashboard() {
  const router = useRouter();

  function openMenu(item: (typeof menu)[number]) {
    if (item.private) {
      const role = localStorage.getItem("rt_role");

      if (!role) {
        router.push("/login");
        return;
      }
    }

    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-blue-900 text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-7 sm:py-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-black">
                <AppName />
              </div>

              <div className="mt-1 text-sm text-blue-100">
                <RtInfo mode="wilayah" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50 active:scale-95"
            >
              <LogIn className="h-4 w-4" strokeWidth={2.2} />
              <span>Login</span>
            </button>
          </div>

          <div className="mt-8">
            <div className="text-sm text-blue-100">
              Portal Digital Warga
            </div>

            <div className="mt-1 flex items-center gap-2 text-xl font-bold">
              <span>
                Selamat datang di <RtInfo mode="short" />
              </span>
              <span aria-hidden="true">👋</span>
            </div>

            <div className="mt-1 text-sm text-blue-100">
              Informasi dan pelayanan digital warga.
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Home className="h-6 w-6" strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-lg font-black">
                Portal Warga <RtInfo mode="short" />
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Pilih menu untuk membuka modul administrasi dan pelayanan RT.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-xl font-black">
              Menu Layanan
            </h2>

            <p className="text-sm text-slate-500">
              Menu administrasi membutuhkan login.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => openMenu(item)}
                 className="group relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-200">
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </div>

                    {item.private && (
                      <LockKeyhole
                        className="h-4 w-4 text-slate-400"
                        strokeWidth={2}
                      />
                    )}
                  </div>

                  <div className="mt-3 text-sm font-bold">
                    {item.title}
                  </div>

                  <div className="mt-1 text-[11px] leading-4 text-slate-500">
                    {item.description}
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <span>Buka</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <h2 className="flex items-center gap-2 font-black">
              <Megaphone className="h-5 w-5 text-blue-600" strokeWidth={2.2} />
              <span>Pengumuman Terbaru</span>
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Informasi untuk warga
            </p>
          </div>

          <div className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <h2 className="flex items-center gap-2 font-black">
              <CalendarDays className="h-5 w-5 text-blue-600" strokeWidth={2.2} />
              <span>Kegiatan Terdekat</span>
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Agenda <RtInfo mode="short" />
            </p>
          </div>
        </section>

        <div className="mt-6 text-center text-xs text-slate-400">
          Data pribadi dan keuangan hanya dapat diakses oleh pengguna
          terautentikasi sesuai hak akses.
        </div>
      </main>
    </div>
  );
}


