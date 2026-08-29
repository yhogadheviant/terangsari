"use client";
import RtInfo from "../../ui/rt-info";

import { FormEvent, useEffect, useState } from "react";

type Row = {
  id: string;
  type: "MASUK" | "KELUAR";
  amount: number;
  category: string;
  description?: string | null;
  date: string;
};

type Summary = {
  masuk: number;
  keluar: number;
  saldo: number;
};

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const kategoriMasuk = [
  "Sumbangan",
  "Bantuan",
  "Donasi",
  "Lainnya",
];

const kategoriKeluar = [
  "Kebutuhan Darurat",
  "Bantuan Warga",
  "Sosial",
  "Kegiatan RT",
  "Lainnya",
];

export default function DanaTaktisPage() {
  const [type, setType] =
    useState<"MASUK" | "KELUAR">("MASUK");

  const [amount, setAmount] = useState("");
  const [category, setCategory] =
    useState(kategoriMasuk[0]);

  const [description, setDescription] =
    useState("");

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [rows, setRows] =
    useState<Row[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      masuk: 0,
      keluar: 0,
      saldo: 0,
    });

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function load() {
    try {
      const response =
        await fetch("/api/dana-taktis", {
          cache: "no-store",
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Gagal membaca Dana Taktis."
        );
      }

      setRows(
        Array.isArray(data.rows)
          ? data.rows
          : []
      );

      setSummary(
        data.summary || {
          masuk: 0,
          keluar: 0,
          saldo: 0,
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal membaca Dana Taktis."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCategory(
      type === "MASUK"
        ? kategoriMasuk[0]
        : kategoriKeluar[0]
    );
  }, [type]);

  async function submit(
    e: FormEvent
  ) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/dana-taktis",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              type,
              amount,
              category,
              description,
              date,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Gagal menyimpan transaksi."
        );
      }

      setMessage(
        type === "MASUK"
          ? "Dana masuk berhasil dicatat."
          : "Dana keluar berhasil dicatat."
      );

      setAmount("");
      setDescription("");

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const yakin =
      window.confirm(
        "Hapus transaksi Dana Taktis ini?"
      );

    if (!yakin) return;

    try {
      const response =
        await fetch(
          `/api/dana-taktis?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Gagal menghapus transaksi."
        );
      }

      setMessage(
        "Transaksi berhasil dihapus."
      );

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus transaksi."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600">
              <RtInfo mode="short" />
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Dana Taktis
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pengelolaan Dana Taktis RT secara terpisah dari Kas RT.
            </p>
          </div>

          <a
            href="/panel"
            className="text-sm font-bold text-blue-600"
          >
            Kembali
          </a>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
            {message}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mb-5 grid gap-3 md:grid-cols-3">

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">
              Dana Masuk
            </div>

            <div className="mt-2 text-2xl font-black text-emerald-600">
              {money(summary.masuk)}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">
              Dana Keluar
            </div>

            <div className="mt-2 text-2xl font-black text-red-600">
              {money(summary.keluar)}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-bold text-slate-500">
              Saldo Dana Taktis
            </div>

            <div className="mt-2 text-2xl font-black text-blue-700">
              {money(summary.saldo)}
            </div>
          </div>

        </section>

        {/* FORM */}

        <section className="mb-5 rounded-2xl border bg-white p-6">

          <h2 className="text-lg font-black">
            Catat Transaksi Dana Taktis
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Dana Taktis berdiri sendiri dan tidak memengaruhi saldo Kas RT.
          </p>

          <form
            onSubmit={submit}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >

            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Jenis Transaksi
              </span>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as
                      | "MASUK"
                      | "KELUAR"
                  )
                }
                className="w-full rounded-xl border px-3 py-3"
              >
                <option value="MASUK">
                  Dana Masuk
                </option>

                <option value="KELUAR">
                  Dana Keluar
                </option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Nominal
              </span>

              <input
                required
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="100000"
                className="w-full rounded-xl border px-3 py-3"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Kategori
              </span>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-xl border px-3 py-3"
              >
                {(type === "MASUK"
                  ? kategoriMasuk
                  : kategoriKeluar
                ).map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Tanggal
              </span>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                className="w-full rounded-xl border px-3 py-3"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Keterangan
              </span>

              <input
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Keterangan transaksi"
                className="w-full rounded-xl border px-3 py-3"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className={`rounded-xl px-5 py-3 font-bold text-white ${
                  type === "MASUK"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {busy
                  ? "Memproses..."
                  : type === "MASUK"
                  ? "Simpan Dana Masuk"
                  : "Simpan Dana Keluar"}
              </button>
            </div>

          </form>

        </section>

        {/* HISTORY */}

        <section className="overflow-hidden rounded-2xl border bg-white">

          <div className="border-b p-5">
            <h2 className="text-lg font-black">
              Riwayat Dana Taktis
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {rows.length} transaksi
            </p>
          </div>

          <div className="overflow-auto">

            <table className="w-full min-w-[800px] text-sm">

              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">
                    Tanggal
                  </th>

                  <th className="p-3 text-left">
                    Jenis
                  </th>

                  <th className="p-3 text-left">
                    Kategori
                  </th>

                  <th className="p-3 text-right">
                    Nominal
                  </th>

                  <th className="p-3 text-left">
                    Keterangan
                  </th>

                  <th className="p-3 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>

                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t"
                  >

                    <td className="p-3">
                      {new Date(
                        row.date
                      ).toLocaleDateString(
                        "id-ID"
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          row.type === "MASUK"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.type === "MASUK"
                          ? "MASUK"
                          : "KELUAR"}
                      </span>
                    </td>

                    <td className="p-3">
                      {row.category}
                    </td>

                    <td
                      className={`p-3 text-right font-bold ${
                        row.type === "MASUK"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {money(row.amount)}
                    </td>

                    <td className="p-3">
                      {row.description ||
                        "-"}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          remove(row.id)
                        }
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200"
                      >
                        Hapus
                      </button>
                    </td>

                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-slate-400"
                    >
                      Belum ada transaksi Dana Taktis.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>
    </main>
  );
}


