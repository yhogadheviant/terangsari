"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ContactRound,
  FileBarChart,
  Hand,
  Landmark,
  LockKeyhole,
  LogIn,
  Megaphone,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import AppName from "./ui/app-name";

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  aktif: boolean;
  tanggal: string;
};

type Kegiatan = {
  id: string;
  nama: string;
  tanggal: string;
  jam?: string | null;
  lokasi?: string | null;
  keterangan?: string | null;
  aktif: boolean;
};

type RTUnit = {
  id: string;
  kodeRT: string;
  kodeRW: string;
  namaRT: string;
  perumahan?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
};

const menu = [
  { icon: ContactRound, title: "Data KK", href: "/panel/kk", private: true },
  { icon: Users, title: "Data Warga", href: "/panel/warga", private: true },
  { icon: BarChart3, title: "Kelompok Usia", href: "/panel/kelompok-usia", private: true },
  { icon: Landmark, title: "Kas RT", href: "/panel/kas", private: true },
  { icon: Shield, title: "Dana Taktis", href: "/panel/dana-taktis", private: true },
  { icon: Wallet, title: "Iuran & QRIS", href: "/panel/iuran", private: true },
  { icon: Megaphone, title: "Pengumuman", href: "/panel/pengumuman", private: false },
  { icon: CalendarDays, title: "Kegiatan RT", href: "/panel/kegiatan", private: false },
  { icon: FileBarChart, title: "Laporan", href: "/panel/laporan", private: true },
  { icon: Settings, title: "Pengaturan", href: "/panel/pengaturan", private: true },
];

export default function Home() {
  const [rtUnit, setRtUnit] = useState<RTUnit | null>(null);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
    loadPengumuman();
    loadKegiatan();
    loadRTUnit();
  }, []);

  async function loadRTUnit() {
    try {
      const saved = localStorage.getItem("rt_rtUnit");

      if (saved) {
        const parsed = JSON.parse(saved) as RTUnit;

        if (parsed?.kodeRT && parsed?.kodeRW) {
          setRtUnit(parsed);
          return;
        }
      }

      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      const candidate =
        data?.user?.rtUnit ??
        data?.user?.RTUnit ??
        data?.rtUnit ??
        data?.RTUnit ??
        data?.data?.rtUnit ??
        data?.data?.RTUnit;

      if (candidate?.kodeRT && candidate?.kodeRW) {
        setRtUnit(candidate as RTUnit);

        localStorage.setItem(
          "rt_rtUnit",
          JSON.stringify(candidate)
        );
      }
    } catch (error) {
      console.error("HOME_RTUNIT_ERROR:", error);
    }
  }

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json();

      const serverAuthenticated =
        response.ok === true &&
        data?.authenticated === true;

      const localAuthenticated =
        Boolean(
          localStorage.getItem("rt_role") ||
          localStorage.getItem("rt11_username")
        );

      setAuthenticated(
        serverAuthenticated || localAuthenticated
      );
    } catch (error) {
      console.error("HOME_AUTH_CHECK_ERROR:", error);

      setAuthenticated(
        Boolean(
          localStorage.getItem("rt_role") ||
          localStorage.getItem("rt11_username")
        )
      );
    } finally {
      setCheckingAuth(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("HOME_LOGOUT_ERROR:", error);
    } finally {
      localStorage.removeItem("rt11_userId");
      localStorage.removeItem("rt11_username");
      setAuthenticated(false);

      window.location.href = "/";
    }
  }

  async function loadPengumuman() {
    try {
      const r = await fetch("/api/pengumuman", {
        cache: "no-store",
      });

      const d = await r.json();

      const rows = Array.isArray(d.data)
        ? d.data
        : Array.isArray(d.pengumuman)
          ? d.pengumuman
          : [];

      setPengumuman(
        rows
          .filter((x: Pengumuman) => x.aktif)
          .sort(
            (a: Pengumuman, b: Pengumuman) =>
              new Date(b.tanggal).getTime() -
              new Date(a.tanggal).getTime()
          )
          .slice(0, 5)
      );
    } catch (error) {
      console.error("HOME_PENGUMUMAN_ERROR:", error);
      setPengumuman([]);
    }
  }

  async function loadKegiatan() {
    try {
      const r = await fetch("/api/kegiatan", {
        cache: "no-store",
      });

      const d = await r.json();

      if (!r.ok || !d.success) {
        throw new Error(
          d.error || "Gagal mengambil kegiatan."
        );
      }

      const rows: Kegiatan[] = Array.isArray(d.kegiatan)
        ? d.kegiatan
        : Array.isArray(d.data)
          ? d.data
          : [];

      const now = new Date();

      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const upcoming = rows
        .filter((x) => {
          if (!x.aktif) return false;

          const tanggal = new Date(x.tanggal);

          return tanggal >= today;
        })
        .sort(
          (a, b) =>
            new Date(a.tanggal).getTime() -
            new Date(b.tanggal).getTime()
        )
        .slice(0, 5);

      setKegiatan(upcoming);
    } catch (error) {
      console.error("HOME_KEGIATAN_ERROR:", error);
      setKegiatan([]);
    }
  }

  const fmt = (t: string) =>
    new Date(t).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const kodeRT = rtUnit?.kodeRT || "";
  const kodeRW = rtUnit?.kodeRW || "";
  const nomorRT = kodeRT ? `RT ${kodeRT}` : "";
  const nomorRW = kodeRW ? `RW ${kodeRW}` : "";
  const namaWilayah = rtUnit?.perumahan || "";

  const wilayahDisplay = [
    namaWilayah,
    [nomorRT, nomorRW]
      .filter(Boolean)
      .join(" / "),
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-black">
                <AppName />
              </div>

              <div className="mt-1 text-sm text-blue-100">
                {wilayahDisplay}
              </div>
            </div>

            {checkingAuth ? (
              <div className="rounded-xl bg-white/70 px-4 py-2 text-sm font-bold text-blue-700">
                Memeriksa...
              </div>
            ) : authenticated ? (
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
              >
                <LogIn className="h-4 w-4 rotate-180" strokeWidth={2.2} />
                <span>Keluar</span>
              </button>
            ) : (
              <a
                href="/login"
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
              >
                <LogIn className="h-4 w-4" strokeWidth={2.2} />
                <span>Login</span>
              </a>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm text-blue-100">
              Portal Digital Warga
            </div>

            <div className="mt-1 flex items-center gap-2 text-xl font-bold">
              <span>
                Selamat datang di {nomorRT}
              </span>
              <Hand className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">

        {/* MENU */}
        <section>
          <h2 className="mb-3 text-xl font-black">
            Menu Layanan
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">

            {menu.map((m) =>
              m.href ? (
                <a
                  key={m.title}
                  href={m.href}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <m.icon
                        className="h-6 w-6"
                        strokeWidth={2.2}
                      />
                    </div>

                    {m.private && (
                      <LockKeyhole
                        className="h-4 w-4 text-slate-400"
                        strokeWidth={2}
                      />
                    )}

                  </div>

                  <div className="mt-3 text-sm font-bold">
                    {m.title}
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <span>Buka</span>
                    <ArrowRight
                      className="h-3.5 w-3.5"
                      strokeWidth={2.5}
                    />
                  </div>
                </a>
              ) : (
                <button
                  key={m.title}
                  onClick={() =>
                    alert(`${m.title} belum dibuat`)
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-center justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <m.icon
                        className="h-6 w-6"
                        strokeWidth={2.2}
                      />
                    </div>

                    {m.private && (
                      <LockKeyhole
                        className="h-4 w-4 text-slate-400"
                        strokeWidth={2}
                      />
                    )}

                  </div>

                  <div className="mt-3 text-sm font-bold">
                    {m.title}
                  </div>
                </button>
              )
            )}

          </div>
        </section>

        {/* PENGUMUMAN + KEGIATAN */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">

          {/* PENGUMUMAN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Megaphone
                    className="h-5 w-5 text-blue-600"
                    strokeWidth={2.2}
                  />
                  <span>Pengumuman Terbaru</span>
                </h2>

                <p className="text-xs text-slate-500">
                  Informasi resmi {nomorRT}
                </p>
              </div>

              <a
                href="/panel/pengumuman"
                className="flex items-center gap-1 text-xs font-bold text-blue-600"
              >
                <span>Lihat</span>
                <ArrowRight
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                />
              </a>

            </div>

            {pengumuman.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Belum ada pengumuman
              </div>
            ) : (
              <div className="space-y-3">

                {pengumuman.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border p-3"
                  >
                    <div className="text-sm font-bold">
                      {p.judul}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {fmt(p.tanggal)}
                    </div>

                    <div className="mt-2 line-clamp-3 text-sm">
                      {p.isi}
                    </div>
                  </div>
                ))}

              </div>
            )}

          </div>

          {/* KEGIATAN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <CalendarDays
                    className="h-5 w-5 text-blue-600"
                    strokeWidth={2.2}
                  />
                  <span>Kegiatan Terdekat</span>
                </h2>

                <p className="text-xs text-slate-500">
                  Agenda warga {nomorRT}
                </p>
              </div>

              <a
                href="/panel/kegiatan"
                className="flex items-center gap-1 text-xs font-bold text-blue-600"
              >
                <span>Lihat</span>
                <ArrowRight
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                />
              </a>

            </div>

            {kegiatan.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Belum ada kegiatan terdekat
              </div>
            ) : (
              <div className="space-y-3">

                {kegiatan.map((k) => (
                  <div
                    key={k.id}
                    className="rounded-xl border p-3"
                  >
                    <div className="text-sm font-bold">
                      {k.nama}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Tanggal: {fmt(k.tanggal)}
                      {k.jam && ` • Jam: ${k.jam}`}
                    </div>

                    {k.lokasi && (
                      <div className="mt-1 text-xs text-slate-500">
                        Lokasi: {k.lokasi}
                      </div>
                    )}

                    {k.keterangan && (
                      <div className="mt-2 line-clamp-2 text-sm">
                        {k.keterangan}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        <div className="mt-8 text-center text-xs text-slate-400">
          {wilayahDisplay}
        </div>

      </main>
    </div>
  );
}
