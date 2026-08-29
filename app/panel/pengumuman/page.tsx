"use client";
import RtInfo from "../../ui/rt-info";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  aktif: boolean;
  tanggal: string;
};

export default function PengumumanPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [data, setData] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);

  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [aktif, setAktif] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage =
    role === "ketua" || role === "sekretaris";

  async function load() {
    try {
      const response = await fetch("/api/pengumuman", {
        cache: "no-store",
      });

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response API pengumuman tidak valid.");
      }

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengambil pengumuman."
        );
      }

      setData(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil pengumuman."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedRole =
      localStorage.getItem("rt_role") || "";

    // Pengumuman boleh dilihat semua role
    if (
      !savedRole ||
      !["ketua", "sekretaris", "bendahara", "warga"].includes(
        savedRole
      )
    ) {
      router.replace("/login");
      return;
    }

    setRole(savedRole);
    load();
  }, [router]);

  function resetForm() {
    setEditingId(null);
    setJudul("");
    setIsi("");
    setAktif(true);
    setTanggal(
      new Date().toISOString().slice(0, 16)
    );
  }

  function editItem(item: Pengumuman) {
    setEditingId(item.id);
    setJudul(item.judul);
    setIsi(item.isi);
    setAktif(item.aktif);

    const date = new Date(item.tanggal);

    const local = new Date(
      date.getTime() -
        date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setTanggal(local);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function save() {
    if (!canManage) return;

    if (!judul.trim()) {
      alert("Judul wajib diisi.");
      return;
    }

    if (!isi.trim()) {
      alert("Isi pengumuman wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/pengumuman",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(editingId
              ? { id: editingId }
              : {}),
            judul: judul.trim(),
            isi: isi.trim(),
            aktif,
            tanggal: new Date(tanggal).toISOString(),
          }),
        }
      );

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "Response server tidak valid."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menyimpan pengumuman."
        );
      }

      alert(
        editingId
          ? "Pengumuman berhasil diperbarui."
          : "Pengumuman berhasil ditambahkan."
      );

      resetForm();
      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengumuman."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktif(item: Pengumuman) {
    if (!canManage) return;

    try {
      setSaving(true);

      const response = await fetch(
        "/api/pengumuman",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            aktif: !item.aktif,
          }),
        }
      );

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "Response server tidak valid."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengubah status pengumuman."
        );
      }

      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengubah status."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Pengumuman) {
    if (!canManage) return;

    const yakin = window.confirm(
      `Hapus pengumuman "${item.judul}"?`
    );

    if (!yakin) return;

    try {
      setSaving(true);

      const response = await fetch(
        `/api/pengumuman?id=${encodeURIComponent(
          item.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "Response server tidak valid."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menghapus pengumuman."
        );
      }

      if (editingId === item.id) {
        resetForm();
      }

      await load();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus pengumuman."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6">
          Memuat pengumuman...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <div className="text-xl font-black">
              “¢ Pengumuman
            </div>

            <div className="mt-1 text-xs text-blue-100">
              Informasi untuk warga <RtInfo mode="short" />
            </div>
          </div>

          <button
            onClick={() => router.push("/panel")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
          >
             Kembali
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">

        {/* INFO ROLE */}
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">
                Login sebagai
              </div>

              <div className="mt-1 font-black">
                {role === "ketua"
                  ? "Ketua RT"
                  : role === "sekretaris"
                  ? "Sekretaris"
                  : role === "bendahara"
                  ? "Bendahara"
                  : "Warga"}
              </div>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                canManage
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {canManage
                ? "Dapat mengelola"
                : "Mode lihat"}
            </div>
          </div>
        </section>

        {/* FORM ADMIN */}
        {canManage && (
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-black">
                  {editingId
                    ? "Edit Pengumuman"
                    : "Tambah Pengumuman"}
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  Pengumuman aktif akan tampil di halaman utama.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={judul}
                onChange={(e) =>
                  setJudul(e.target.value)
                }
                placeholder="Judul pengumuman"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-blue-500"
              />

              <textarea
                value={isi}
                onChange={(e) =>
                  setIsi(e.target.value)
                }
                placeholder="Isi pengumuman"
                rows={5}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-blue-500"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Tanggal & waktu
                  </label>

                  <input
                    type="datetime-local"
                    value={tanggal}
                    onChange={(e) =>
                      setTanggal(e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={aktif}
                    onChange={(e) =>
                      setAktif(e.target.checked)
                    }
                  />

                  Tampilkan di halaman utama
                </label>
              </div>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Memproses..."
                  : editingId
                  ? "OK Simpan Perubahan"
                  : "OK Publikasikan Pengumuman"}
              </button>
            </div>
          </section>
        )}

        {/* DAFTAR */}
        <section className="rounded-2xl border bg-white p-5">
          <div>
            <h2 className="text-lg font-black">
              Daftar Pengumuman
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {data.length} pengumuman tersimpan.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {data.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">
                        {item.judul}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          item.aktif
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.aktif
                          ? "AKTIF"
                          : "NONAKTIF"}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(
                        item.tanggal
                      ).toLocaleString("id-ID")}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          toggleAktif(item)
                        }
                        className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
                      >
                        {item.aktif
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          editItem(item)
                        }
                        className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          remove(item)
                        }
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {item.isi}
                </div>
              </article>
            ))}

            {!data.length && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-400">
                Belum ada pengumuman.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}



