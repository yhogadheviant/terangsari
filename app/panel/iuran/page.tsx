"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  kkId: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  periode: string;
  amount: number;
  status: "BELUM_BAYAR" | "LUNAS";
  method?: string | null;
  jumlahAnggota: number;
};

type Qris = {
  merchantName: string;
  qrisName: string;
  qrisString: string;
  imageUrl: string;
  active: boolean;
};

const methods = ["CASH", "TRANSFER", "QRIS", "LAINNYA"];

function getQrisImageUrl(url: string) {
  const value = (url || "").trim();

  if (!value) {
    return "";
  }

  if (value.includes("drive.google.com")) {
    return `/api/qris-image?url=${encodeURIComponent(value)}`;
  }

  return value;
}

const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default function IuranPage() {
  function apiHeaders(extra?: Record<string, string>) {
    const headers: Record<string, string> = { ...(extra || {}) };
    const role = localStorage.getItem("rt_role");
    const activeRT = localStorage.getItem("rt_superadmin_active");

    if (role === "superadmin" && activeRT) {
      headers["x-rt-unit-id"] = activeRT;
    }

    return headers;
  }
  const router = useRouter();

  const [periode, setPeriode] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [kks, setKks] = useState<any[]>([]);

  const [qris, setQris] = useState<Qris>({
    merchantName: "",
    qrisName: "",
    qrisString: "",
    imageUrl: "",
    active: true,
  });

  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("40000");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "SEMUA" | "BELUM_BAYAR" | "LUNAS"
  >("SEMUA");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const r = await fetch(`/api/iuran?periode=${periode}`, {
        cache: "no-store", credentials: "include", headers: apiHeaders(),
      });

      const text = await r.text();

      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("API iuran mengembalikan response tidak valid.");
      }

      if (!r.ok) {
        throw new Error(d.error || "Gagal memuat iuran.");
      }

      setRows(d.iuran || []);
      setKks(d.kks || []);

      if (d.qris) {
        setQris(d.qris);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateIuran() {
    const nominal = Number(amount);

    if (!Number.isFinite(nominal) || nominal <= 0) {
      alert("Nominal iuran tidak valid.");
      return;
    }

    const yakin = window.confirm(
      `Regenerate iuran ${periode}?\n\n` +
      `Nominal baru: ${rp(nominal)} / KK\n\n` +
      `Hanya tagihan BELUM BAYAR yang akan diubah.\n` +
      `Tagihan LUNAS tetap aman.`
    );

    if (!yakin) return;

    try {
      setProcessing(true);

      const r = await fetch("/api/iuran", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "regenerate",
          periode,
          amount: nominal,
        }),
      });

      const text = await r.text();
      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response server tidak valid.");
      }

      if (!r.ok) {
        throw new Error(d.error || "Gagal regenerate iuran.");
      }

      await load();

      alert(
        `${d.message}\n\n` +
        `Periode: ${d.periode}\n` +
        `Nominal baru: ${rp(d.amount)}\n` +
        `Tagihan diubah: ${d.diubah}`
      );
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Gagal regenerate iuran."
      );
    } finally {
      setProcessing(false);
    }
  }
  async function generateIuran() {
    const nominal = Number(amount);

    if (!Number.isFinite(nominal) || nominal <= 0) {
      alert("Nominal iuran tidak valid.");
      return;
    }

    const yakin = window.confirm(
      `Generate tagihan iuran ${periode} untuk semua KK?\n\n` +
      `Nominal: ${rp(nominal)} / KK\n` +
      `KK yang sudah memiliki tagihan tidak akan dibuat ulang.`
    );

    if (!yakin) return;

    try {
      setProcessing(true);

      const r = await fetch("/api/iuran", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          periode,
          amount: nominal,
        }),
      });

      const text = await r.text();

      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response server tidak valid.");
      }

      if (!r.ok) {
        throw new Error(
          d.error || "Gagal membuat tagihan iuran."
        );
      }

      await load();

      alert(
        `${d.message}\n\n` +
        `Total KK: ${d.totalKK}\n` +
        `Sudah ada: ${d.sudahAda}\n` +
        `Ditambahkan: ${d.ditambahkan}\n` +
        `Total tagihan: ${d.totalTagihan}`
      );
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Gagal membuat tagihan iuran."
      );
    } finally {
      setProcessing(false);
    }
  }
  useEffect(() => {
    const role = localStorage.getItem("rt_role");

    if (!role || !["superadmin", "ketua", "bendahara"].includes(role)) {
      router.replace("/panel");
      return;
    }

    load();
  }, [periode]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return rows.filter((r) => {
      const cocokStatus =
        statusFilter === "SEMUA" ||
        r.status === statusFilter;

      const cocokSearch =
        !q ||
        r.kepalaKeluarga.toLowerCase().includes(q) ||
        r.nomorKK.includes(q);

      return cocokStatus && cocokSearch;
    });
  }, [rows, search, statusFilter]);

  const lunas = rows.filter((r) => r.status === "LUNAS");

  const belumBayar = rows.filter(
    (r) => r.status === "BELUM_BAYAR"
  );

  const masuk = lunas.reduce(
    (s, r) => s + r.amount,
    0
  );

  const totalTunggakan = belumBayar.reduce(
    (s, r) => s + r.amount,
    0
  );

  function pilihBayar(row: Row) {
    setSelected(row.kkId);
    setAmount(String(row.amount));
    setMethod("CASH");
    setNote("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
  async function pay() {
    if (!selected) {
      alert("Pilih Kepala Keluarga.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Nominal pembayaran tidak valid.");
      return;
    }

    try {
      setProcessing(true);

      const r = await fetch("/api/iuran", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kkId: selected,
          periode,
          amount: Number(amount),
          method,
          note,
        }),
      });

      const text = await r.text();

      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response server tidak valid.");
      }

      if (!r.ok) {
        throw new Error(d.error || "Gagal menyimpan pembayaran.");
      }

      setSelected("");
      setNote("");

      await load();

      alert("Pembayaran berhasil dicatat.");
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan pembayaran."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function cancel(id: string, nama: string) {
    const yakin = window.confirm(
      `Batalkan pembayaran ${nama}?\n\n` +
        `Status akan dikembalikan menjadi BELUM BAYAR.\n` +
        `Tanggal pembayaran dan metode pembayaran akan dihapus.`
    );

    if (!yakin) return;

    try {
      setProcessing(true);

      const r = await fetch("/api/iuran", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: "BELUM_BAYAR",
        }),
      });

      const text = await r.text();

      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response server tidak valid.");
      }

      if (!r.ok) {
        throw new Error(
          d.error || "Gagal membatalkan pembayaran."
        );
      }

      await load();

      alert("Pembayaran berhasil dibatalkan.");
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Gagal membatalkan pembayaran."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function saveQris() {
    try {
      setProcessing(true);

      const r = await fetch("/api/iuran", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(qris),
      });

      const text = await r.text();

      let d: any = {};

      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Response server tidak valid.");
      }

      if (!r.ok) {
        throw new Error(d.error || "Gagal menyimpan QRIS.");
      }

      alert("QRIS berhasil disimpan.");
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan QRIS."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6">
          Memuat...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-6xl justify-between px-4 py-5">
          <div>
            <div className="text-xl font-black">
              Iuran & QRIS
            </div>

            <div className="text-xs text-blue-100">
              1 KK = 1 iuran per bulan
            </div>
          </div>

          <button
            onClick={() => router.push("/panel")}
            className="rounded-xl bg-white/15 px-4 py-2"
          >
            Kembali
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">

        {/* STATISTIK */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["KK wajib bayar", rows.length],
            ["Lunas", lunas.length],
            ["Belum bayar", belumBayar.length],
            ["Penerimaan", rp(masuk)],
            ["Total tunggakan", rp(totalTunggakan)],
          ].map(([a, b]) => (
            <div
              key={String(a)}
              className="rounded-2xl border bg-white p-4"
            >
              <div className="text-xs text-slate-500">
                {a}
              </div>

              <div className="mt-1 text-xl font-black">
                {b}
              </div>
            </div>
          ))}
        </div>

        {/* PERIODE */}
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Periode</h2>

              <p className="text-xs text-slate-500">
                Tagihan dihitung per Kepala Keluarga.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="rounded-xl border px-3 py-2"
              />

              <input
                type="number"
                min="1"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nominal / KK"
                className="w-40 rounded-xl border px-3 py-2"
              />

              <button
                type="button"
                onClick={generateIuran}
                disabled={processing}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing
                  ? "Memproses..."
                  : "Generate Iuran"}
              </button>
              <button type="button" onClick={regenerateIuran} disabled={processing} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">{processing ? "Memproses..." : "Regenerate Iuran"}</button>
            </div>
          </div>
        </section>

        {/* CATAT PEMBAYARAN */}
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-black">
            Catat Pembayaran
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-xl border px-3 py-2 md:col-span-2"
            >
              <option value="">
                -- Pilih Kepala Keluarga --
              </option>

              {kks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kepalaKeluarga} - KK {k.nomorKK}
                </option>
              ))}
            </select>

            <input
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value.replace(/\D/g, "")
                )
              }
              className="rounded-xl border px-3 py-2"
              placeholder="Nominal"
            />

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-xl border px-3 py-2"
            >
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <button
              onClick={pay}
              disabled={processing}
              className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Memproses..." : "Simpan Lunas"}
            </button>
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan (opsional)"
            className="mt-3 w-full rounded-xl border px-3 py-2"
          />

          {method === "QRIS" && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="font-black text-blue-800">
                Pembayaran QRIS
              </div>

              {qris.merchantName && (
                <div className="mt-1 text-sm text-slate-600">
                  {qris.merchantName}
                </div>
              )}

              {qris.qrisName && (
                <div className="text-sm font-semibold text-slate-700">
                  {qris.qrisName}
                </div>
              )}

              {qris.imageUrl ? (
                <div className="mt-4 flex justify-center">
                  <img
                    src={getQrisImageUrl(qris.imageUrl)}
                    alt="QRIS Pembayaran"
                    className="h-64 w-64 rounded-2xl border bg-white object-contain p-2"
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-white p-4 text-center text-sm text-slate-500">
                  Gambar QRIS belum dikonfigurasi.
                </div>
              )}

              {qris.qrisString && (
                <div className="mt-3 break-all rounded-xl bg-white p-3 text-xs text-slate-500">
                  {qris.qrisString}
                </div>
              )}

              {!qris.active && (
                <div className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-700">
                  QRIS sedang tidak aktif.
                </div>
              )}
            </div>
          )}
        </section>

        {/* DAFTAR IURAN */}
        <section className="rounded-2xl border bg-white p-4 md:p-5">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-black">
                {statusFilter === "BELUM_BAYAR"
                  ? "Daftar Tunggakan Iuran"
                  : "Daftar Iuran KK"}
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                {statusFilter === "BELUM_BAYAR"
                  ? `${belumBayar.length} KK belum melakukan pembayaran • Total ${rp(totalTunggakan)}`
                  : "Satu baris = satu Kepala Keluarga."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "SEMUA"
                      | "BELUM_BAYAR"
                      | "LUNAS"
                  )
                }
                className="rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="BELUM_BAYAR">Belum Bayar</option>
                <option value="LUNAS">Lunas</option>
              </select>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kepala keluarga / No. KK"
                className="rounded-xl border px-3 py-2.5 flex-1"
              />
            </div>
          </div>

          {/* MOBILE */}
          <div className="md:hidden mt-4 space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Kepala Keluarga
                    </div>

                    <div className="mt-1 font-black text-base truncate">
                      {r.kepalaKeluarga}
                    </div>

                    <div className="mt-1 text-xs font-mono text-slate-500 break-all">
                      KK {r.nomorKK}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                      r.status === "LUNAS"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.status === "LUNAS" ? "LUNAS" : "BELUM BAYAR"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Nominal
                    </div>
                    <div className="mt-1 font-black text-base">
                      {rp(r.amount)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Anggota
                    </div>
                    <div className="mt-1 font-black text-base">
                      {r.jumlahAnggota} orang
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Metode
                    </div>
                    <div className="mt-1 text-sm font-bold">
                      {r.method || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Periode
                    </div>
                    <div className="mt-1 text-sm font-bold">
                      {r.periode}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">
                    Alamat
                  </div>
                  <div className="mt-1 text-sm leading-5">
                    {r.alamat || "-"}
                  </div>
                </div>

                {r.status === "LUNAS" ? (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => cancel(r.id, r.kepalaKeluarga)}
                    className="mt-4 w-full rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batalkan Lunas
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => pilihBayar(r)}
                    className="mt-4 w-full rounded-xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Bayar Iuran
                  </button>
                )}
              </div>
            ))}

            {!filtered.length && (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-400">
                Belum ada KK.
              </div>
            )}
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "No. KK",
                    "Kepala Keluarga",
                    "Anggota",
                    "Alamat",
                    "Nominal",
                    "Status",
                    "Metode",
                    "Aksi",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-3">{r.nomorKK}</td>

                    <td className="px-3 py-3 font-semibold">
                      {r.kepalaKeluarga}
                    </td>

                    <td className="px-3 py-3">
                      {r.jumlahAnggota}
                    </td>

                    <td className="px-3 py-3">
                      {r.alamat}
                    </td>

                    <td className="px-3 py-3">
                      {rp(r.amount)}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          r.status === "LUNAS"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.status === "LUNAS"
                          ? "LUNAS"
                          : "BELUM BAYAR"}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {r.method || "-"}
                    </td>

                    <td className="px-3 py-3">
                      {r.status === "LUNAS" ? (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() =>
                            cancel(r.id, r.kepalaKeluarga)
                          }
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Batalkan Lunas
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => pilihBayar(r)}
                          className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Bayar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-slate-400"
                    >
                      Belum ada KK.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {/* QRIS */}
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                QRIS Pembayaran
              </h2>

              <p className="text-xs text-slate-500">
                QRIS tetap terpisah dari Kas RT dan Dana Taktis.
              </p>
            </div>

            <label className="text-sm">
              <input
                type="checkbox"
                checked={qris.active}
                onChange={(e) =>
                  setQris((v) => ({
                    ...v,
                    active: e.target.checked,
                  }))
                }
              />{" "}
              Aktif
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={qris.merchantName}
              onChange={(e) =>
                setQris((v) => ({
                  ...v,
                  merchantName: e.target.value,
                }))
              }
              placeholder="Nama merchant / penerima"
              className="rounded-xl border px-3 py-2"
            />

            <input
              value={qris.qrisName}
              onChange={(e) =>
                setQris((v) => ({
                  ...v,
                  qrisName: e.target.value,
                }))
              }
              placeholder="Nama QRIS"
              className="rounded-xl border px-3 py-2"
            />

            <input
              value={qris.imageUrl}
              onChange={(e) =>
                setQris((v) => ({
                  ...v,
                  imageUrl: e.target.value,
                }))
              }
              placeholder="URL gambar QRIS"
              className="rounded-xl border px-3 py-2"
            />

            <button
              onClick={saveQris}
              disabled={processing}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Simpan QRIS
            </button>
          </div>

          <textarea
            value={qris.qrisString}
            onChange={(e) =>
              setQris((v) => ({
                ...v,
                qrisString: e.target.value,
              }))
            }
            rows={3}
            placeholder="Payload / string QRIS (opsional)"
            className="mt-3 w-full rounded-xl border px-3 py-2"
          />

          {qris.active && qris.imageUrl && (
            <img
              src={getQrisImageUrl(qris.imageUrl)}
              alt="QRIS"
              className="mt-4 h-56 w-56 rounded-xl border object-contain"
            />
          )}
        </section>
      </div>
    </main>
  );
}























