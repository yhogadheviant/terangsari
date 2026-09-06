"use client";

import { useEffect, useState } from "react";

export default function PengaturanAplikasiPage() {
  const [appName, setAppName] = useState("Smart Warga");
  const [appLogo, setAppLogo] = useState("");
  const [copyright, setCopyright] = useState(
    `© ${new Date().getFullYear()} Smart RT 011 Terangsari 1. All rights reserved.`
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "/api/superadmin/settings",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Gagal mengambil pengaturan."
        );
      }

      setAppName(
        data.data?.appName || "Smart Warga"
      );

      setAppLogo(
        data.data?.appLogo || ""
      );

      setCopyright(
        data.data?.copyright ||
          `© ${new Date().getFullYear()} Smart RT 011 Terangsari 1. All rights reserved.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil pengaturan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings() {
    const trimmedName = appName.trim();
    const trimmedLogo = appLogo.trim();
    const trimmedCopyright = copyright.trim();

    if (!trimmedName) {
      setError("Nama aplikasi wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const res = await fetch(
        "/api/superadmin/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appName: trimmedName,
            appLogo: trimmedLogo,
            copyright: trimmedCopyright,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Gagal menyimpan pengaturan."
        );
      }

      setAppName(
        data.data?.appName || trimmedName
      );

      setAppLogo(
        data.data?.appLogo || ""
      );

      setCopyright(
        data.data?.copyright ||
          `© ${new Date().getFullYear()} Smart RT 011 Terangsari 1. All rights reserved.`
      );

      setMessage(
        data.message ||
          "Pengaturan identitas portal berhasil disimpan."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pengaturan."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          Memuat pengaturan aplikasi...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">
            Pengaturan Aplikasi
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Pengaturan identitas global platform untuk
            seluruh RT.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">
            Identitas Portal
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Nama dan logo ini akan digunakan sebagai
            identitas portal di seluruh platform.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Nama Portal
            </label>

            <input
              value={appName}
              onChange={(e) =>
                setAppName(e.target.value)
              }
              maxLength={80}
              placeholder="Smart Warga"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Maksimal 80 karakter.
            </p>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Teks Copyright
            </label>

            <textarea
              value={copyright}
              onChange={(e) =>
                setCopyright(e.target.value)
              }
              maxLength={500}
              rows={3}
              placeholder="© 2026 Smart RT 011 Terangsari 1. All rights reserved."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Maksimal 500 karakter. Teks ini akan
              ditampilkan di bagian bawah halaman portal.
            </p>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              URL Logo Portal
            </label>

            <input
              value={appLogo}
              onChange={(e) =>
                setAppLogo(e.target.value)
              }
              maxLength={500}
              placeholder="https://contoh.com/logo.png"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Gunakan URL gambar dengan http:// atau
              https://. Kosongkan jika ingin menggunakan
              ikon bawaan.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-bold text-slate-700">
              Preview Identitas
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                {appLogo.trim() ? (
                  <img
                    src={appLogo.trim()}
                    alt="Logo portal"
                    className="h-full w-full object-contain bg-white p-2"
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />
                ) : (
                  <span className="text-xl font-black">
                    {appName
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "S"}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-lg font-black tracking-tight text-slate-900">
                  {appName || "Smart Warga"}
                </div>

                <div className="text-sm font-medium text-slate-500">
                  Portal Warga Digital
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-bold text-slate-800">
              Contoh penggunaan
            </div>

            <div className="mt-2">
              <strong>
                {appName || "Smart Warga"}
              </strong>{" "}
              RT 011/RW 005
            </div>

            <div>
              <strong>
                {appName || "Smart Warga"}
              </strong>{" "}
              RT 012/RW 005
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={saveSettings}
              disabled={
                saving || !appName.trim()
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan Pengaturan"}
            </button>

            <button
              type="button"
              onClick={() =>
                window.location.href =
                  "/panel/superadmin"
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}