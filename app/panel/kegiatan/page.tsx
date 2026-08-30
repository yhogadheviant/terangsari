"use client";
import RtInfo from "../../ui/rt-info";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Kegiatan = {
  id: string;
  nama: string;
  tanggal: string;
  jam: string | null;
  lokasi: string | null;
  keterangan: string | null;
  aktif: boolean;
};

const formatTanggal = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export default function KegiatanPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [aktif, setAktif] = useState(true);

  async function load() {
    setLoading(true);

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

      setRows(data.kegiatan || []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil kegiatan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditing(null);
    setNama("");
    setTanggal("");
    setJam("");
    setLokasi("");
    setKeterangan("");
    setAktif(true);
  }

  function edit(row: Kegiatan) {
    setEditing(row.id);
    setNama(row.nama);
    setTanggal(row.tanggal.slice(0, 10));
    setJam(row.jam || "");
    setLokasi(row.lokasi || "");
    setKeterangan(row.keterangan || "");
    setAktif(row.aktif);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function save() {
    if (!nama.trim()) {
      alert("Nama kegiatan wajib diisi.");
      return;
    }

    if (!tanggal) {
      alert("Tanggal kegiatan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id: editing,
        nama,
        tanggal,
        jam,
        lokasi,
        keterangan,
        aktif,
      };

      const response = await fetch("/api/kegiatan", {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal menyimpan kegiatan."
        );
      }

      alert(
        editing
          ? "Kegiatan berhasil diperbarui."
          : "Kegiatan berhasil ditambahkan."
      );

      resetForm();
      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan kegiatan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Yakin ingin menghapus kegiatan ini?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/kegiatan?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal menghapus kegiatan."
        );
      }

      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus kegiatan."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <div className="text-xl font-black">
              Ž‰ Kegiatan RT
            </div>

            <div className="mt-1 text-xs text-blue-100">
              Agenda dan kegiatan warga <RtInfo mode="short" />
            </div>
          </div>

          <button
            onClick={() => router.push("/panel")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
          >
             Beranda
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">

        {/* FORM */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                {editing
                  ? "Edit Kegiatan"
                  : "Tambah Kegiatan"}
              </h2>

              <p className="text-xs text-slate-500">
                Isi agenda kegiatan warga.
              </p>
            </div>

            {editing && (
              <button
                onClick={resetForm}
                className="rounded-xl border px-3 py-2 text-xs font-bold"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">

            <input
              value={nama}
              onChange={(e) =>
                setNama(e.target.value)
              }
              placeholder="Nama kegiatan"
              className="rounded-xl border px-3 py-2"
            />

            <input
              type="date"
              value={tanggal}
              onChange={(e) =>
                setTanggal(e.target.value)
              }
              className="rounded-xl border px-3 py-2"
            />

            <input
              type="time"
              value={jam}
              onChange={(e) =>
                setJam(e.target.value)
              }
              className="rounded-xl border px-3 py-2"
            />

            <input
              value={lokasi}
              onChange={(e) =>
                setLokasi(e.target.value)
              }
              placeholder="Lokasi"
              className="rounded-xl border px-3 py-2"
            />

            <textarea
              value={keterangan}
              onChange={(e) =>
                setKeterangan(e.target.value)
              }
              placeholder="Keterangan"
              rows={3}
              className="rounded-xl border px-3 py-2 md:col-span-2"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={aktif}
                onChange={(e) =>
                  setAktif(e.target.checked)
                }
              />
              Tampilkan sebagai kegiatan aktif
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : editing
                ? "OK Simpan Perubahan"
                : "OK Tambah Kegiatan"}
          </button>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                Daftar Kegiatan
              </h2>

              <p className="text-xs text-slate-500">
                Agenda kegiatan <RtInfo mode="short" />
              </p>
            </div>

            <button
              onClick={load}
              className="rounded-xl border px-3 py-2 text-xs font-bold text-blue-600"
            >
              „ Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Memuat kegiatan...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Belum ada kegiatan.
            </div>
          ) : (
            <div className="mt-4 space-y-3">

              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border p-4 ${
                    row.aktif
                      ? "border-slate-200"
                      : "border-slate-100 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">
                          {row.nama}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            row.aktif
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.aktif
                            ? "AKTIF"
                            : "NONAKTIF"}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        … {formatTanggal(row.tanggal)}
                        {row.jam &&
                          ` • ${row.jam}`}
                      </div>

                      {row.lokasi && (
                        <div className="mt-1 text-sm text-slate-500">
                           {row.lokasi}
                        </div>
                      )}

                      {row.keterangan && (
                        <div className="mt-2 text-sm text-slate-500">
                          {row.keterangan}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => edit(row)}
                        className="rounded-xl border px-3 py-2 text-xs font-bold text-blue-600"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          remove(row.id)
                        }
                        className="rounded-xl border px-3 py-2 text-xs font-bold text-red-600"
                      >
                        Hapus
                      </button>
                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}
        </section>

      </div>
    </main>
  );
}





