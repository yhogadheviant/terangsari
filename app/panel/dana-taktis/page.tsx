"use client";

import RtInfo from "../../ui/rt-info";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Row = {
  id: string;
  type: "MASUK" | "KELUAR";
  amount: number;
  category: string;
  description?: string | null;
  date: string;
};

type MonthlyRecap = {
  periode: string;
  masuk: number;
  keluar: number;
  masukKumulatif: number;
  keluarKumulatif: number;
  saldoKumulatif: number;
};

type Summary = {
  masuk: number;
  keluar: number;
  saldo: number;
  masukPeriode: number;
  keluarPeriode: number;
  saldoPeriode: number;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const periodLabel = (period: string) => {
  if (period === "ALL") return "Keseluruhan";
  if (/^\d{4}$/.test(period)) return `Tahun ${period}`;
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const categoriesMasuk = ["Iuran", "Sumbangan", "Bantuan", "Donasi", "Transfer", "Lainnya"];
const categoriesKeluar = ["Kebutuhan Darurat", "Bantuan Warga", "Sosial", "Kegiatan RT", "Transfer", "Lainnya"];

export default function DanaTaktisPage() {
  const [type, setType] = useState<"MASUK" | "KELUAR">("MASUK");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoriesMasuk[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [recap, setRecap] = useState<MonthlyRecap[]>([]);
  const [summary, setSummary] = useState<Summary>({
    masuk: 0, keluar: 0, saldo: 0,
    masukPeriode: 0, keluarPeriode: 0, saldoPeriode: 0,
  });
  const [periode, setPeriode] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Array<{ rowNumber?: number; row: number; sheet?: string; date: string; description: string; category: string; type: "MASUK" | "KELUAR"; amount: number; saldo: number; warning?: string | null }>>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => periodLabel(periode), [periode]);

  async function load(selected = periode) {
    try {
      setMessage("");
      const response = await fetch(
        `/api/dana-taktis?periode=${encodeURIComponent(selected || "ALL")}`,
        { cache: "no-store", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membaca Dana Taktis.");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setRecap(Array.isArray(data.rekapBulanan) ? data.rekapBulanan : []);
      setSummary(data.summary || {
        masuk: 0, keluar: 0, saldo: 0,
        masukPeriode: 0, keluarPeriode: 0, saldoPeriode: 0,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membaca Dana Taktis.");
    }
  }

  useEffect(() => {
    load();
  }, [periode]);

  useEffect(() => {
    setCategory(type === "MASUK" ? categoriesMasuk[0] : categoriesKeluar[0]);
  }, [type]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/dana-taktis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, amount, category, description, date }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan transaksi.");
      setAmount("");
      setDescription("");
      setMessage(type === "MASUK" ? "Dana masuk berhasil dicatat." : "Dana keluar berhasil dicatat.");
      await load(periode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan transaksi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus transaksi Dana Taktis ini?")) return;
    try {
      const response = await fetch(`/api/dana-taktis?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus transaksi.");
      setMessage("Transaksi berhasil dihapus.");
      await load(periode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus transaksi.");
    }
  }

  async function exportExcel() {
    window.location.href = `/api/dana-taktis/export?periode=${encodeURIComponent(periode)}`;
  }

  async function exportPdf() {
    window.location.href = `/api/dana-taktis/export-pdf?periode=${encodeURIComponent(periode)}`;
  }

  async function importExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "preview");
      const response = await fetch("/api/dana-taktis/import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Preview Excel gagal.");
      setPreview(
        Array.isArray(data.rows)
          ? data.rows.map((r: any) => ({
              ...r,
              row: r.row ?? r.rowNumber,
              saldo: Number(r.saldo ?? 0),
            }))
          : []
      );
      setPreviewFile(file);
      setPreviewOpen(true);
      setMessage(`Preview siap: ${data.rows?.length || 0} transaksi akan diimpor.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview Excel gagal.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!previewFile || !preview.length || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", previewFile);
      form.append("action", "confirm");
      const response = await fetch("/api/dana-taktis/import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import Excel gagal.");
      setPreviewOpen(false);
      setPreview([]);
      setPreviewFile(null);
      setMessage(`Import berhasil: ${data.imported} transaksi ditambahkan.`);
      await load(periode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import Excel gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600"><RtInfo mode="short" /></p>
            <h1 className="mt-1 text-3xl font-black">Laporan Dana Taktis</h1>
            <p className="mt-1 text-sm text-slate-500">Model buku kas: tanggal, keterangan, debet, kredit, dan saldo.</p>
          </div>
          <a href="/panel" className="text-sm font-bold text-blue-600">Kembali</a>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">{message}</div>
        )}

        <section className="mb-5 rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Periode Laporan</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPeriode("ALL")}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ${periode === "ALL" ? "bg-blue-600 text-white" : "border bg-white text-slate-700"}`}
                >
                  Keseluruhan
                </button>
                <input
                  type="month"
                  value={periode === "ALL" || /^\d{4}$/.test(periode) ? currentMonth() : periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
              >
                Import Excel
              </button>
              <button type="button" onClick={exportExcel} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                Export Excel
              </button>
              <button type="button" onClick={exportPdf} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                Export PDF
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Laporan aktif: <b>{selectedLabel}</b>. Klik bulan pada rekap untuk langsung membuka bulan tersebut.</p>
        </section>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">TOTAL DEBET / DANA MASUK</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{money(summary.masuk)}</div>
            {periode !== "ALL" && <div className="mt-1 text-xs text-slate-400">Periode: {money(summary.masukPeriode)}</div>}
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">TOTAL KREDIT / DANA KELUAR</div>
            <div className="mt-2 text-2xl font-black text-red-600">{money(summary.keluar)}</div>
            {periode !== "ALL" && <div className="mt-1 text-xs text-slate-400">Periode: {money(summary.keluarPeriode)}</div>}
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">SALDO DANA TAKTIS</div>
            <div className="mt-2 text-2xl font-black text-blue-700">{money(summary.saldo)}</div>
            {periode !== "ALL" && <div className="mt-1 text-xs text-slate-400">Saldo periode: {money(summary.saldoPeriode)}</div>}
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <h2 className="text-lg font-black">Rekap Bulanan</h2>
            <p className="mt-1 text-xs text-slate-500">Klik nama bulan untuk melihat transaksi bulan tersebut.</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Bulan</th>
                  <th className="p-3 text-right">Debet</th>
                  <th className="p-3 text-right">Debet Kumulatif</th>
                  <th className="p-3 text-right">Kredit</th>
                  <th className="p-3 text-right">Kredit Kumulatif</th>
                  <th className="p-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {recap.map((r) => (
                  <tr key={r.periode} className={`border-t transition hover:bg-blue-50 ${r.periode === periode ? "bg-blue-50" : ""}`}>
                    <td className="p-3">
                      <button type="button" onClick={() => setPeriode(r.periode)} className="font-black text-blue-700 hover:underline">
                        {periodLabel(r.periode)}
                      </button>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">{money(r.masuk)}</td>
                    <td className="p-3 text-right font-bold">{money(r.masukKumulatif)}</td>
                    <td className="p-3 text-right font-bold text-red-700">{money(r.keluar)}</td>
                    <td className="p-3 text-right font-bold">{money(r.keluarKumulatif)}</td>
                    <td className="p-3 text-right font-black">{money(r.saldoKumulatif)}</td>
                  </tr>
                ))}
                {!recap.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada rekap Dana Taktis.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-black">Catat Transaksi</h2>
          <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">Jenis</span>
              <select value={type} onChange={(e) => setType(e.target.value as "MASUK" | "KELUAR")} className="w-full rounded-xl border px-3 py-3">
                <option value="MASUK">Debet / Dana Masuk</option>
                <option value="KELUAR">Kredit / Dana Keluar</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">Nominal</span>
              <input required value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="100000" className="w-full rounded-xl border px-3 py-3" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">Kategori</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border px-3 py-3">
                {(type === "MASUK" ? categoriesMasuk : categoriesKeluar).map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">Tanggal</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border px-3 py-3" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-600">Keterangan</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Keterangan transaksi" className="w-full rounded-xl border px-3 py-3" />
            </label>
            <div className="md:col-span-2">
              <button disabled={busy} className={`rounded-xl px-5 py-3 font-bold text-white ${type === "MASUK" ? "bg-emerald-600" : "bg-red-600"} disabled:opacity-50`}>
                {busy ? "Memproses..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <h2 className="text-lg font-black">Buku Kas Dana Taktis — {selectedLabel}</h2>
            <p className="mt-1 text-xs text-slate-500">{rows.length} transaksi.</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Tanggal</th>
                  <th className="p-3 text-left">Keterangan</th>
                  <th className="p-3 text-right">Debet</th>
                  <th className="p-3 text-right">Kredit</th>
                  <th className="p-3 text-right">Saldo</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let running = 0;
                  const ordered = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  return ordered.map((row) => {
                    running += row.type === "MASUK" ? row.amount : -row.amount;
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="p-3">{new Date(row.date).toLocaleDateString("id-ID")}</td>
                        <td className="p-3">
                          <div className="font-bold">{row.description || row.category || "-"}</div>
                          <div className="text-xs text-slate-400">{row.category}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">{row.type === "MASUK" ? money(row.amount) : "-"}</td>
                        <td className="p-3 text-right font-bold text-red-700">{row.type === "KELUAR" ? money(row.amount) : "-"}</td>
                        <td className="p-3 text-right font-black">{money(running)}</td>
                        <td className="p-3 text-center">
                          <button type="button" onClick={() => remove(row.id)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">Hapus</button>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Belum ada transaksi pada periode ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-black">Preview Import Excel</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {previewFile?.name || "File Excel"} — {preview.length} transaksi siap diimpor.
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700">
                    Saldo dihitung otomatis dari DEBET − KREDIT, bukan diambil sebagai transaksi dari kolom SALDO Excel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPreviewOpen(false); setPreview([]); setPreviewFile(null); }}
                  className="rounded-lg border px-3 py-2 text-sm font-bold"
                >
                  Tutup
                </button>
              </div>

              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Baris</th>
                      <th className="p-3 text-left">Tanggal</th>
                      <th className="p-3 text-left">Keterangan</th>
                      <th className="p-3 text-left">Kategori</th>
                      <th className="p-3 text-center">Jenis</th>
                      <th className="p-3 text-right">Nominal</th>\n                      <th className="p-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={`${r.row}-${r.type}-${r.amount}`} className="border-t">
                        <td className="p-3">{r.row}</td>
                        <td className="p-3">{r.date}</td>
                        <td className="p-3">{r.description || "-"}</td>
                        <td className="p-3">{r.category}</td>
                        <td className={`p-3 text-center font-bold ${r.type === "MASUK" ? "text-emerald-700" : "text-red-700"}`}>
                          {r.type === "MASUK" ? "DEBET" : "KREDIT"}
                        </td>
                        <td className="p-3 text-right font-bold">{money(r.amount)}</td>
                        <td className={`p-3 text-right font-black ${r.saldo < 0 ? "text-red-700" : "text-slate-900"}`}>
                          {money(r.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Data belum masuk database sampai Anda menekan <b>Konfirmasi Import</b>.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPreviewOpen(false); setPreview([]); setPreviewFile(null); }}
                    className="rounded-xl border bg-white px-5 py-3 text-sm font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={busy || !preview.length}
                    onClick={confirmImport}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "Mengimpor..." : "Konfirmasi Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
