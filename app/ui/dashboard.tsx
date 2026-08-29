"use client";

import { useRouter } from "next/navigation";
import AppName from "./app-name";
import RtInfo from "./rt-info";

const menu = [
  { icon: "👨‍👩‍👧", title: "Data KK", description: "Data kartu keluarga", href: "/panel/kk", private: true },
  { icon: "👥", title: "Data Warga", description: "Data warga RT", href: "/panel/warga", private: true },
  { icon: "📊", title: "Kelompok Usia", description: "Kelompok & statistik usia warga", href: "/panel/kelompok-usia", private: true },
  { icon: "💰", title: "Kas RT", description: "Pemasukan & pengeluaran RT", href: "/panel/kas", private: true },
  { icon: "🛡️", title: "Dana Taktis", description: "Pembukuan dana taktis", href: "/panel/dana-taktis", private: true },
  { icon: "📱", title: "Iuran & QRIS", description: "Iuran warga & pembayaran", href: "/panel/iuran", private: true },
  { icon: "📢", title: "Pengumuman", description: "Informasi warga", href: "/panel/pengumuman", private: false },
  { icon: "🎉", title: "Kegiatan RT", description: "Agenda & kegiatan warga", href: "/panel/kegiatan", private: false },
  { icon: "📄", title: "Laporan", description: "Laporan administrasi RT", href: "/panel/laporan", private: true },
  { icon: "⚙️", title: "Pengaturan", description: "Pengaturan sistem", href: "/panel/pengaturan", private: true },
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
      <header className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
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
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700"
            >
              🔐 Login
            </button>
          </div>

          <div className="mt-6">
            <div className="text-sm text-blue-100">
              Portal Digital Warga
            </div>

            <div className="mt-1 text-xl font-bold">
              Selamat datang di <RtInfo mode="short" /> 👋
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🏠
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
            {menu.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => openMenu(item)}
                className="block rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                    {item.icon}
                  </div>

                  {item.private && (
                    <span className="text-sm">🔒</span>
                  )}
                </div>

                <div className="mt-3 text-sm font-bold">
                  {item.title}
                </div>

                <div className="mt-1 text-[11px] leading-4 text-slate-500">
                  {item.description}
                </div>

                <div className="mt-3 text-[11px] font-bold text-blue-600">
                  Buka →
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">
              📢 Pengumuman Terbaru
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Informasi untuk warga
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">
              🎉 Kegiatan Terdekat
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



