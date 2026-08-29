"use client";

import { useEffect, useMemo, useState } from "react";
import RtInfo from "../../ui/rt-info";

type Member = {
  id: string;
  nik: string;
  nama: string;
  jenisKelamin: string;
  hubunganKeluarga: string;
  statusTinggal: string;
  usia?: number | null;
  tanggalLahir?: string | null;
  daerahKKAsal?: string | null;
};

type KK = {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  rt?: string | null;
  rw?: string | null;
  statusTinggal: string;
  nomorHP?: string | null;
  warga: Member[];
};

const emptyForm = {
  nomorKK: "",
  kepalaKeluarga: "",
  alamat: "",
  rt: "",
  rw: "",
  statusTinggal: "TETAP",
  nomorHP: "",
};

const tinggal = [
  ["TETAP", "Tetap"],
  ["SEWA", "Sewa"],
  ["KONTRAK", "Kontrak"],
  ["MENUMPANG", "Menumpang"],
  ["LAINNYA", "Lainnya"],
];

const hubungan: Record<string, string> = {
  KEPALA_KELUARGA: "Kepala Keluarga",
  ISTRI: "Istri",
  SUAMI: "Suami",
  ANAK: "Anak",
  ORANG_TUA: "Orang Tua",
  MERTUA: "Mertua",
  LAINNYA: "Lainnya",
};

export default function DataKKPage() {
  const [rows, setRows] = useState<KK[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<KK | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/kk", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const text = await r.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!r.ok) {
        setMsg(data?.error || `Gagal mengambil data KK. HTTP ${r.status}`);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("KK_PAGE_LOAD_ERROR", error);
      setMsg("Gagal mengambil data KK.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = q.toLowerCase().trim();
    if (!text) return rows;

    return rows.filter((x) =>
      `${x.nomorKK} ${x.kepalaKeluarga} ${x.alamat} ${x.rt} ${x.rw}`
        .toLowerCase()
        .includes(text)
    );
  }, [rows, q]);

  const totalWarga = rows.reduce((n, x) => n + x.warga.length, 0);

  function newKK() {
    setSelected(null);
    setForm(emptyForm);
    setMsg("");
    setShowForm(true);
  }

  function editKK(x: KK) {
    setSelected(x);
    setForm({
      nomorKK: x.nomorKK,
      kepalaKeluarga: x.kepalaKeluarga,
      alamat: x.alamat || "",
      rt: x.rt || "",
      rw: x.rw || "",
      statusTinggal: x.statusTinggal || "TETAP",
      nomorHP: x.nomorHP || "",
    });
    setShowForm(true);
  }

  async function save() {
    if (busy) return;

    const isEdit = Boolean(selected?.id);

    if (
      !form.nomorKK.trim() ||
      !form.kepalaKeluarga.trim() ||
      !form.alamat.trim()
    ) {
      setMsg("Nomor KK, kepala keluarga, dan alamat wajib diisi.");
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const payload: Record<string, string> = {
        nomorKK: form.nomorKK.trim(),
        kepalaKeluarga: form.kepalaKeluarga.trim(),
        alamat: form.alamat.trim(),
        rt: form.rt.trim(),
        rw: form.rw.trim(),
        statusTinggal: form.statusTinggal,
        nomorHP: form.nomorHP.trim(),
      };

      if (selected?.id) {
        payload.id = selected.id;
      }

      console.log("KK_SAVE_PAYLOAD", payload);

      const r = await fetch("/api/kk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      let j: any = {};

      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        j = {};
      }

      if (!r.ok) {
        setMsg(j?.error || `Gagal menyimpan data KK. HTTP ${r.status}`);
        return;
      }

      const savedId = j?.id || selected?.id || null;

      await load();

      if (savedId) {
        const refresh = await fetch("/api/kk", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const refreshText = await refresh.text();

        if (refresh.ok) {
          const list: KK[] = refreshText ? JSON.parse(refreshText) : [];
          setRows(list);

          const updated = list.find((x) => x.id === savedId) || null;
          setSelected(updated);
        }
      } else {
        setSelected(null);
      }

      setShowForm(false);
      setMsg(
        isEdit
          ? "Data KK berhasil diperbarui."
          : "Data KK berhasil ditambahkan."
      );
    } catch (error) {
      console.error("KK_PAGE_SAVE_ERROR", error);
      setMsg("Terjadi kesalahan saat menyimpan data KK.");
    } finally {
      setBusy(false);
    }
  }

  async function removeKK(x: KK) {
    if (busy) return;

    if (x.warga.length > 0) {
      setMsg(
        `KK ${x.nomorKK} masih memiliki ${x.warga.length} anggota. Hapus anggota/ubah relasi terlebih dahulu.`
      );
      return;
    }

    if (!confirm(`Hapus KK ${x.nomorKK}?`)) return;

    setBusy(true);
    setMsg("");

    try {
      const r = await fetch(
        `/api/kk?id=${encodeURIComponent(x.id)}`,
        {
          method: "DELETE",
          credentials: "include",
          cache: "no-store",
        }
      );

      const text = await r.text();
      let j: any = {};

      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        j = {};
      }

      if (!r.ok) {
        setMsg(j?.error || `Gagal menghapus data KK. HTTP ${r.status}`);
        return;
      }

      if (selected?.id === x.id) {
        setSelected(null);
        setShowForm(false);
      }

      await load();
      setMsg("Data KK berhasil dihapus.");
    } catch (error) {
      console.error("KK_PAGE_DELETE_ERROR", error);
      setMsg("Terjadi kesalahan saat menghapus data KK.");
    } finally {
      setBusy(false);
    }
  }

  function selectKK(x: KK) {
    setSelected(x);
    setShowForm(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black">Data KK</h1>
            <p className="text-sm text-slate-500">
              Database kartu keluarga <RtInfo mode="short" />
            </p>
          </div>
          <a href="/panel" className="text-blue-600 font-bold text-sm">
             Kembali
          </a>
        </div>

        {msg && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Total KK" value={rows.length} />
          <Stat label="Total Warga" value={totalWarga} />
          <Stat
            label="KK Tetap"
            value={rows.filter((x) => x.statusTinggal === "TETAP").length}
          />
          <Stat
            label="KK Kontrak/Sewa"
            value={rows.filter((x) =>
              ["KONTRAK", "SEWA"].includes(x.statusTinggal)
            ).length}
          />
        </div>

        <section className="bg-white border rounded-2xl p-5 mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-lg">Daftar Kartu Keluarga</h2>
              <p className="text-xs text-slate-500">
                Klik baris KK untuk melihat seluruh anggotanya.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari No. KK / kepala keluarga..."
                className="border rounded-xl px-3 py-2.5 w-full md:w-80"
              />
              <button
                onClick={newKK}
                className="bg-blue-600 text-white rounded-xl px-4 font-bold whitespace-nowrap"
              >
                + Tambah KK
              </button>
            </div>
          </div>

          <div className="overflow-auto mt-4 border rounded-xl">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">No. KK</th>
                  <th className="p-3 text-left">Kepala Keluarga</th>
                  <th className="p-3 text-left">Alamat</th>
                  <th className="p-3 text-left">RT/RW</th>
                  <th className="p-3 text-left">Status Tinggal</th>
                  <th className="p-3 text-center">Anggota</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr
                    key={x.id}
                    onClick={() => selectKK(x)}
                    className={`border-t cursor-pointer hover:bg-blue-50 ${
                      selected?.id === x.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="p-3 font-bold">{x.nomorKK}</td>
                    <td className="p-3">{x.kepalaKeluarga}</td>
                    <td className="p-3">{x.alamat}</td>
                    <td className="p-3">
                      {x.rt || "-"} / {x.rw || "-"}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                        {x.statusTinggal}
                      </span>
                    </td>
                    <td className="p-3 text-center font-black">
                      {x.warga.length}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMsg("");
                          setSelected(x);
                          setForm({
                            nomorKK: x.nomorKK || "",
                            kepalaKeluarga: x.kepalaKeluarga || "",
                            alamat: x.alamat || "",
                            rt: x.rt || "",
                            rw: x.rw || "",
                            statusTinggal: x.statusTinggal || "TETAP",
                            nomorHP: x.nomorHP || "",
                          });
                          setShowForm(true);
                        }}
                        className="text-blue-600 font-bold mr-3 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeKK(x);
                        }}
                        className="text-red-600 font-bold"
                        disabled={busy}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      Belum ada data KK.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showForm && (
          <section className="bg-white border rounded-2xl p-5 mb-5">
            <div className="flex justify-between mb-5">
              <div>
                <h2 className="text-lg font-black">
                  {selected ? "Edit Data KK" : "Tambah Data KK"}
                </h2>
                <p className="text-xs text-slate-500">
                  Data ini menjadi induk relasi anggota keluarga.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-500 font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field
                label="No. KK *"
                value={form.nomorKK}
                onChange={(v) => setForm({ ...form, nomorKK: v })}
              />
              <Field
                label="Nama Kepala Keluarga *"
                value={form.kepalaKeluarga}
                onChange={(v) => setForm({ ...form, kepalaKeluarga: v })}
              />
              <Field
                label="No. HP"
                value={form.nomorHP}
                onChange={(v) => setForm({ ...form, nomorHP: v })}
              />
              <Field
                label="Alamat *"
                value={form.alamat}
                onChange={(v) => setForm({ ...form, alamat: v })}
              />
              <Field
                label="RT"
                value={form.rt}
                onChange={(v) => setForm({ ...form, rt: v })}
              />
              <Field
                label="RW"
                value={form.rw}
                onChange={(v) => setForm({ ...form, rw: v })}
              />
              <Select
                label="Status Tinggal"
                value={form.statusTinggal}
                onChange={(v) => setForm({ ...form, statusTinggal: v })}
                options={tinggal}
              />
            </div>

            <button
              onClick={save}
              disabled={busy}
              className="mt-5 bg-blue-600 text-white rounded-xl px-6 py-3 font-bold"
            >
              {busy ? "Menyimpan..." : "Simpan Data KK"}
            </button>
          </section>
        )}

        {selected && (
          <section className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-5 border-b">
              <div className="flex flex-col md:flex-row justify-between gap-3">
                <div>
                  <h2 className="font-black text-xl">
                    KK {selected.nomorKK}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Kepala Keluarga:{" "}
                    <strong>{selected.kepalaKeluarga}</strong>
                  </p>
                  <p className="text-sm text-slate-500">
                    {selected.alamat}  RT {selected.rt || "-"} / RW{" "}
                    {selected.rw || "-"}  {selected.statusTinggal}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">
                    {selected.warga.length}
                  </div>
                  <div className="text-xs text-slate-500">anggota keluarga</div>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left">NIK</th>
                    <th className="p-3 text-left">Nama</th>
                    <th className="p-3 text-left">Hubungan</th>
                    <th className="p-3 text-left">JK</th>
                    <th className="p-3 text-left">Usia</th>
                    <th className="p-3 text-left">Status Tinggal</th>
                    <th className="p-3 text-left">Daerah KK Asal</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.warga.map((w) => (
                    <tr key={w.id} className="border-t">
                      <td className="p-3 font-mono">{w.nik}</td>
                      <td className="p-3 font-bold">{w.nama}</td>
                      <td className="p-3">
                        {hubungan[w.hubunganKeluarga] || w.hubunganKeluarga}
                      </td>
                      <td className="p-3">
                        {w.jenisKelamin === "PEREMPUAN" ? "Perempuan" : "Laki-laki"}
                      </td>
                      <td className="p-3">{w.usia ?? "-"}</td>
                      <td className="p-3">{w.statusTinggal || "-"}</td>
                      <td className="p-3">{w.daerahKKAsal || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      <span className="block text-xs font-bold text-slate-600 mb-1">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <label>
      <span className="block text-xs font-bold text-slate-600 mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}





