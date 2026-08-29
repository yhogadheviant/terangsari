"use client";

import { useEffect, useState } from "react";

type RTUnit = {
  id: string;
  kodeRT: string;
  kodeRW: string;
  namaRT: string;
  perumahan: string | null;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  aktif: boolean;
};

type Account = {
  username: string;
  role: string;
};

type SettingsResponse = {
  success: boolean;
  rt: RTUnit | null;
  account: Account | null;
  error?: string;
};

const roleLabel: Record<string, string> = {
  KETUA: "Ketua RT",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  WARGA: "Warga",
};

export default function PengaturanPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    kodeRT: "",
    kodeRW: "",
    namaRT: "",
    perumahan: "",
    desa: "",
    kecamatan: "",
    kabupaten: "",
  });

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/pengaturan", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal mengambil pengaturan.");
      }

      setData(json);

      if (json.rt) {
        setForm({
          kodeRT: json.rt.kodeRT || "",
          kodeRW: json.rt.kodeRW || "",
          namaRT: json.rt.namaRT || "",
          perumahan: json.rt.perumahan || "",
          desa: json.rt.desa || "",
          kecamatan: json.rt.kecamatan || "",
          kabupaten: json.rt.kabupaten || "",
        });
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal mengambil pengaturan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const res = await fetch("/api/pengaturan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || "Gagal menyimpan pengaturan."
        );
      }

      setMessage("Pengaturan RT berhasil disimpan.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan pengaturan."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            Memuat pengaturan...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <h1 className="text-2xl font-black text-slate-900">
            Pengaturan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola identitas RT dan informasi akun yang sedang digunakan.
          </p>
        </section>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">
                  Identitas RT
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Informasi ini digunakan sebagai identitas wilayah RT.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nomor RT"
                value={form.kodeRT}
                onChange={(v) => updateField("kodeRT", v)}
                placeholder="011"
              />

              <Field
                label="Nomor RW"
                value={form.kodeRW}
                onChange={(v) => updateField("kodeRW", v)}
                placeholder="005"
              />

              <Field
                label="Nama RT"
                value={form.namaRT}
                onChange={(v) => updateField("namaRT", v)}
                placeholder="RT 011 Terangsari 1"
                className="sm:col-span-2"
              />

              <Field
                label="Perumahan"
                value={form.perumahan}
                onChange={(v) => updateField("perumahan", v)}
                placeholder="Perumahan Terangsari 1"
              />

              <Field
                label="Desa / Kelurahan"
                value={form.desa}
                onChange={(v) => updateField("desa", v)}
                placeholder="Cibalongsari"
              />

              <Field
                label="Kecamatan"
                value={form.kecamatan}
                onChange={(v) => updateField("kecamatan", v)}
                placeholder="Klari"
              />

              <Field
                label="Kabupaten"
                value={form.kabupaten}
                onChange={(v) => updateField("kabupaten", v)}
                placeholder="Karawang"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                ‘¤ Akun Saya
              </h2>

              <div className="mt-5 space-y-4">
                <Info
                  label="Username"
                  value={data?.account?.username || "-"}
                />

                <Info
                  label="Role"
                  value={
                    roleLabel[data?.account?.role || ""] ||
                    data?.account?.role ||
                    "-"
                  }
                />

                <Info
                  label="Status RT"
                  value={data?.rt?.aktif ? "Aktif" : "Tidak aktif"}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                ” Keamanan
              </h2>

              <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                <div className="text-sm font-black text-emerald-700">
                  Session Aman
                </div>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Session menggunakan cookie HTTP-only dengan signature
                  server-side.
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">
                  Hak akses
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Akses API dibatasi berdasarkan RT dan role akun.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

