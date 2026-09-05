"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import RtInfo from "../../ui/rt-info";

const initial = {
  nik:"", nama:"", nomorKK:"", daerahKKAsal:"", alamat:"", rt:"", rw:"",
  statusTinggal:"TETAP", hubunganKeluarga:"KEPALA_KELUARGA", jenisKelamin:"LAKI_LAKI",
  tempatLahir:"", tanggalLahir:"", usia:"", golonganDarah:"", agama:"ISLAM", pendidikan:"",
  pekerjaan:"", statusKawin:"", namaIbu:"", namaAyah:"", nomorPaspor:"",
  tanggalAkhirPaspor:"", hubungan:"", kodeHubungan:""
};

const cols: [string,string][] = [
  ["nik","NIK"],["nama","Nama Lengkap"],["nomorKK","No. KK"],
  ["statusTinggal","Status Tinggal"],["hubunganKeluarga","Hubungan Keluarga"],
  ["jenisKelamin","Jenis Kelamin"],["alamat","Alamat"],["rt","RT"],["rw","RW"],
  ["tempatLahir","Tempat Lahir"],["tanggalLahir","Tanggal Lahir"],["usia","Usia"],
  ["golonganDarah","Gol. Darah"],["agama","Agama"],["pendidikan","Pendidikan"],
  ["pekerjaan","Pekerjaan"],["statusKawin","Status Perkawinan"],["namaIbu","Nama Ibu"],
  ["namaAyah","Nama Ayah"],["nomorPaspor","No. Paspor"],["tanggalAkhirPaspor","Akhir Paspor"],
  ["hubungan","Hubungan"],["kodeHubungan","Kode Hubungan"],["daerahKKAsal","Daerah KK Asal"]
];

const requiredQuality = [
  ["nik","NIK"],["nama","Nama"],["nomorKK","No. KK"],["alamat","Alamat"],
  ["tempatLahir","Tempat Lahir"],["tanggalLahir","Tanggal Lahir"],["agama","Agama"],
  ["pendidikan","Pendidikan"],["pekerjaan","Pekerjaan"],["statusKawin","Status Perkawinan"]
];

const tinggal = [
  ["TETAP","Tetap"],["SEWA","Sewa"],["KONTRAK","Kontrak"],["MENUMPANG","Menumpang"],["LAINNYA","Lainnya"]
];
const hubungan = [
  ["KEPALA_KELUARGA","Kepala Keluarga"],["ISTRI","Istri"],["SUAMI","Suami"],
  ["ANAK","Anak"],["ORANG_TUA","Orang Tua"],["MERTUA","Mertua"],["LAINNYA","Lainnya"]
];
const pendidikan = [
  ["TIDAK_SEKOLAH","Tidak sekolah"],["SD","SD"],["SLTP","SLTP"],["SLTA","SLTA"],
  ["D1","D1"],["D2","D2"],["D3","D3"],["D4","D4"],["S1","S1"],["S2","S2"],["S3","S3"],["LAINNYA","Lainnya"]
];
const agama = [
  ["ISLAM","Islam"],["KRISTEN","Kristen"],["KATOLIK","Katolik"],
  ["HINDU","Hindu"],["BUDDHA","Buddha"],["KONGHUCU","Konghucu"],["LAINNYA","Lainnya"]
];
const kawin = [
  ["BELUM","Belum kawin"],["KAWIN","Kawin"],["CERAI_HIDUP","Cerai hidup"],["CERAI_MATI","Cerai mati"]
];

const TABLE_MIN_WIDTH = 3200;
const NIK_W = 150;
const NAMA_W = 260;
const KK_W = 175;

export default function Page() {
  const [data,setData] = useState<any[]>([]);
  const [q,setQ] = useState("");
  const [form,setForm] = useState(initial);
  const [show,setShow] = useState(false);
  const [file,setFile] = useState<File|null>(null);
  const [preview,setPreview] = useState<any[]>([]);
  const [errors,setErrors] = useState<string[]>([]);
  const [msg,setMsg] = useState("");
  const [busy,setBusy] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);

  function apiHeaders(extra?: Record<string,string>) {
    const headers: Record<string,string> = {
      ...(extra || {}),
    };

    const role = localStorage.getItem("rt_role");
    const activeRT = localStorage.getItem("rt_superadmin_active");

    if (role === "superadmin" && activeRT) {
      headers["x-rt-unit-id"] = activeRT;
    }

    return headers;
  }

  const previewTop = useRef<HTMLDivElement>(null);
  const previewBody = useRef<HTMLDivElement>(null);
  const previewLeft = useRef<HTMLDivElement>(null);
  const previewLeftInner = useRef<HTMLDivElement>(null);

  const listTop = useRef<HTMLDivElement>(null);
  const listBody = useRef<HTMLDivElement>(null);
  const listLeft = useRef<HTMLDivElement>(null);
  const listLeftInner = useRef<HTMLDivElement>(null);

  async function load() {
  try {
    const r = await fetch("/api/warga", {
      cache: "no-store",
      headers: apiHeaders(),
    });

    const j = await r.json();

    console.log("WARGA_LOAD:", {
      status: r.status,
      ok: r.ok,
      jumlah: Array.isArray(j) ? j.length : "BUKAN ARRAY",
    });

    if (!r.ok) {
      setMsg(j?.error || `Gagal memuat data warga (${r.status})`);
      setData([]);
      return;
    }

    setData(Array.isArray(j) ? j : []);
  } catch (error) {
    console.error("WARGA_LOAD_ERROR:", error);
    setMsg("Gagal memuat data warga.");
    setData([]);
  }
}

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => data.filter(x =>
      `${x.nik} ${x.nama} ${x.nomorKK} ${x.daerahKKAsal||""}`
        .toLowerCase().includes(q.toLowerCase())
    ),
    [data,q]
  );

  const set = (k:string,v:string) => setForm(x=>({...x,[k]:v}));

  function age(v:string) {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) return "";
    const n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    const m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
    return String(Math.max(0,a));
  }

  function completeness() {
    return requiredQuality.map(([key,label]) => ({
      key,label,
      count: preview.filter(x => x[key]!=null && String(x[key]).trim()!=="").length,
      total: preview.length
    }));
  }

  async function save(e:FormEvent) {
    e.preventDefault();
    const nik=String(form.nik||'').trim();
    const nomorKK=String(form.nomorKK||'').trim();
    if(!/^\d{16}$/.test(nik)) return setMsg('NIK harus terdiri dari 16 digit angka.');
    if(nomorKK && !/^\d{16}$/.test(nomorKK)) return setMsg('Nomor KK harus terdiri dari 16 digit angka.');
    if(form.tanggalLahir && new Date(form.tanggalLahir)>new Date()) return setMsg('Tanggal lahir tidak boleh di masa depan.');
    setBusy(true);

    try {
      const r = await fetch("/api/warga", {
        method: editingId ? "PUT" : "POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(
          editingId
            ? { ...form, id: editingId }
            : form
        )
      });

      const j = await r.json();

      if (!r.ok) {
        setMsg(j.error||"Gagal menyimpan.");
        return;
      }

      setMsg(
        editingId
          ? "Data warga berhasil diubah."
          : "Data warga berhasil disimpan."
      );

      setForm(initial);
      setEditingId(null);
      setShow(false);
      await load();
    } catch (error) {
      console.error("WARGA_SAVE_ERROR:", error);
      setMsg("Terjadi kesalahan saat menyimpan data warga.");
    } finally {
      setBusy(false);
    }
  }

  function editWarga(row:any) {
    const next = { ...initial };

    for (const key of Object.keys(initial)) {
      const value = row[key];

      if (value === null || value === undefined) {
        next[key as keyof typeof initial] = "";
      } else if (
        key === "tanggalLahir" ||
        key === "tanggalAkhirPaspor"
      ) {
        next[key as keyof typeof initial] =
          value ? String(value).slice(0,10) : "";
      } else {
        next[key as keyof typeof initial] = String(value);
      }
    }

    setForm(next);
    setEditingId(String(row.id));
    setShow(true);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteWarga(row:any) {
    const nama = String(row.nama || "warga");

    if (
      !window.confirm(
        `Hapus data warga "${nama}"? Data yang dihapus tidak dapat dikembalikan.`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const r = await fetch("/api/warga", {
        method:"DELETE",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ id: row.id })
      });

      const j = await r.json();

      if (!r.ok) {
        setMsg(j.error||"Gagal menghapus data warga.");
        return;
      }

      if (editingId === String(row.id)) {
        setEditingId(null);
        setForm(initial);
        setShow(false);
      }

      setMsg("Data warga berhasil dihapus.");
      await load();
    } catch (error) {
      console.error("WARGA_DELETE_ERROR:", error);
      setMsg("Terjadi kesalahan saat menghapus data warga.");
    } finally {
      setBusy(false);
    }
  }

  async function previewExcel() {
    if (!file) return setMsg("Pilih file Excel terlebih dahulu.");
    setBusy(true);
    const f = new FormData();
    f.append("file",file);
    const r = await fetch("/api/warga/import-preview",{method:"POST",body:f});
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error||"Gagal membaca Excel.");
    setPreview(j.rows||[]);
    setErrors(j.errors||[]);
    setMsg(`Preview ${j.total} warga dari sheet "${j.sheet}".`);
  }

  async function exportExcel() {
    if (!data.length) {
      setMsg("Belum ada data warga untuk diekspor.");
      return;
    }

    setBusy(true);

    try {
      const r = await fetch("/api/warga/export", {
        method: "GET",
        cache: "no-store",
        headers: apiHeaders(),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMsg(j.error || "Gagal mengekspor Excel.");
        return;
      }

      const blob = await r.blob();
      const disposition = r.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

      const filename = match
        ? decodeURIComponent(match[1])
        : "Data-Warga.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setMsg(`Export berhasil: ${filename}`);
    } catch (error) {
      console.error("WARGA_EXPORT_ERROR:", error);
      setMsg("Terjadi kesalahan saat mengekspor Excel.");
    } finally {
      setBusy(false);
    }
  }
  async function exportPdf() {
    if (!data.length) {
      setMsg("Belum ada data warga untuk diekspor.");
      return;
    }

    setBusy(true);

    try {
      const r = await fetch("/api/warga/export-pdf", {
        method: "GET",
        cache: "no-store",
        headers: apiHeaders(),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Export PDF gagal.");
      }

      const blob = await r.blob();

      const disposition = r.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || "Data-Warga.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setMsg(`Export PDF berhasil: ${filename}`);
    } catch (e: any) {
      setMsg(e?.message || "Export PDF gagal.");
    } finally {
      setBusy(false);
    }
  }
  async function importRows() {
    if (!preview.length) return;
    setBusy(true);
    const r = await fetch("/api/warga/import", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({rows:preview})
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.detail ? `${j.error} ${j.detail}` : (j.error||"Import gagal."));
    setMsg(`Berhasil menyimpan ${j.saved} warga dan ${j.kkCreated} KK baru.`);
    setPreview([]);
    setErrors([]);
    load();
  }

  useEffect(() => {
    const pairs = [
      [previewTop.current, previewBody.current],
      [listTop.current, listBody.current],
    ] as const;

    const cleanups: (()=>void)[] = [];

    for (const [top, body] of pairs) {
      if (!top || !body) continue;
      let syncing = false;
      const a = () => {
        if (syncing) return;
        syncing = true;
        body.scrollLeft = top.scrollLeft;
        requestAnimationFrame(()=>{syncing=false});
      };
      const b = () => {
        if (syncing) return;
        syncing = true;
        top.scrollLeft = body.scrollLeft;
        requestAnimationFrame(()=>{syncing=false});
      };
      top.addEventListener("scroll",a);
      body.addEventListener("scroll",b);
      cleanups.push(()=>{top.removeEventListener("scroll",a);body.removeEventListener("scroll",b)});
    }
    return () => cleanups.forEach(fn=>fn());
  }, [preview.length, data.length]);

  useEffect(() => {
    const pairs = [
      [previewLeft.current, previewBody.current, previewLeftInner.current],
      [listLeft.current, listBody.current, listLeftInner.current],
    ] as const;

    const cleanups: (()=>void)[] = [];

    for (const [left,body,inner] of pairs) {
      if (!left || !body || !inner) continue;

      inner.style.height = `${body.scrollHeight}px`;
      let syncing = false;

      const a = () => {
        if (syncing) return;
        syncing = true;
        body.scrollTop = left.scrollTop;
        requestAnimationFrame(()=>{syncing=false});
      };
      const b = () => {
        if (syncing) return;
        syncing = true;
        left.scrollTop = body.scrollTop;
        requestAnimationFrame(()=>{syncing=false});
      };

      left.addEventListener("scroll",a);
      body.addEventListener("scroll",b);
      cleanups.push(()=>{left.removeEventListener("scroll",a);body.removeEventListener("scroll",b)});
    }

    return () => cleanups.forEach(fn=>fn());
  }, [preview.length, data.length, filtered.length]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:p-4 md:p-8">
      <style>{`
        .rt11-table-wrap { position:relative; }
        .rt11-top-scroll {
          height:0; overflow:hidden;
          border:1px solid #dbe3ef; border-bottom:0;
          border-radius:12px 12px 0 0; background:#f8fafc;
        }
        .rt11-top-inner { height:1px; min-width:${TABLE_MIN_WIDTH}px; }
        .rt11-left-scroll {
          position:absolute; left:-18px; top:0; width:16px;
          height:100%; overflow-y:auto; overflow-x:hidden;
          background:#f8fafc; border:1px solid #dbe3ef; border-right:0;
          border-radius:10px 0 0 10px;
        }
        .rt11-left-inner { width:1px; }
        .rt11-body-scroll {
          width:100%; max-height:600px; overflow-x:auto; overflow-y:auto;
          border:1px solid #dbe3ef; border-radius:0 0 12px 12px;
        }
        .rt11-table { min-width:${TABLE_MIN_WIDTH}px; width:max-content; border-collapse:separate; border-spacing:0; }
        .rt11-table th, .rt11-table td { border-right:1px solid #edf1f6; }
        .rt11-table thead th { position:sticky; top:0; z-index:20; background:#f8fafc; }
        .rt11-sticky-nik { position:sticky !important; left:0; z-index:31 !important; min-width:${NIK_W}px; width:${NIK_W}px; background:white !important; overflow:hidden; }
        .rt11-sticky-nama { position:sticky !important; left:${NIK_W}px; z-index:40 !important; min-width:${NAMA_W}px; width:${NAMA_W}px; background:white !important; overflow:hidden; }
        .rt11-sticky-kk { position:sticky !important; left:${NIK_W+NAMA_W}px; z-index:29 !important; min-width:${KK_W}px; width:${KK_W}px; background:white !important; box-shadow:5px 0 8px -8px rgba(0,0,0,.45); }
        .rt11-table thead .rt11-sticky-nik { z-index:41 !important; background:#f8fafc !important; }
        .rt11-table thead .rt11-sticky-nama { z-index:40 !important; background:#f8fafc !important; }
        .rt11-table thead .rt11-sticky-kk { z-index:39 !important; background:#f8fafc !important; }
        .rt11-table tbody tr:hover .rt11-sticky-nik,
        .rt11-table tbody tr:hover .rt11-sticky-nama,
        .rt11-table tbody tr:hover .rt11-sticky-kk { background:#eff6ff !important; }
        .rt11-scroll-note { font-size:11px; color:#64748b; margin:6px 0 8px; }
        @media(max-width:768px) {
          .rt11-table .rt11-sticky-nik {
            position:sticky !important;
            left:0 !important;
            z-index:60 !important;
            min-width:125px !important;
            width:125px !important;
            max-width:125px !important;
            background:#fff !important;
            overflow:hidden !important;
            box-shadow:1px 0 0 #e2e8f0;
          }

          .rt11-table .rt11-sticky-nama {
            position:sticky !important;
            left:125px !important;
            z-index:59 !important;
            min-width:145px !important;
            width:145px !important;
            max-width:145px !important;
            background:#fff !important;
            overflow:hidden !important;
            box-shadow:1px 0 0 #e2e8f0;
          }

          .rt11-table thead .rt11-sticky-nik {
            z-index:80 !important;
            background:#f8fafc !important;
          }

          .rt11-table thead .rt11-sticky-nama {
            z-index:79 !important;
            background:#f8fafc !important;
          }

          .rt11-table .rt11-sticky-nama,
          .rt11-table .rt11-sticky-nik {
            white-space:nowrap !important;
            text-overflow:clip !important;
          }

          .rt11-table .rt11-sticky-kk {
            position:static !important;
            left:auto !important;
            z-index:auto !important;
            min-width:auto !important;
            width:auto !important;
            max-width:none !important;
            background:inherit !important;
            box-shadow:none !important;
          }
        }
        @media(max-width:768px) {
          .rt11-left-scroll { left:-14px; width:12px; }
          .rt11-body-scroll { max-height:560px; overflow-x:auto; overflow-y:auto; }
        }
      `}</style>

      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-start justify-between gap-3 mb-5 sm:items-center sm:mb-6">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Data Warga</h1>
            <p className="text-sm text-slate-500">Database kependudukan <RtInfo mode="short" /></p>
          </div>
          <a href="/panel" className="shrink-0 text-blue-600 font-bold text-xs sm:text-sm">Kembali</a>
        </div>

        {msg && <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">{msg}</div>}

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="w-full min-w-0 bg-white border rounded-2xl p-4 sm:p-5">
            <div className="text-2xl"></div>
            <h2 className="font-black mt-2">Input Data Warga</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">Form lengkap sesuai database kependudukan <RtInfo mode="short" />.</p>
            <button onClick={()=>setShow(!show)} className="w-full sm:w-auto bg-blue-600 text-white rounded-xl px-5 py-3 font-bold">
              {show?"Tutup Form":"+ Tambah Warga"}
            </button>
          </div>

          <div className="w-full min-w-0 bg-white border rounded-2xl p-4 sm:p-5">
            <div className="text-2xl"></div>
            <h2 className="font-black mt-2">Import / Export Excel</h2>
            <p className="text-xs text-slate-500 mt-1 mb-3">Daerah asal KK dicatat sebagai nama daerah, bukan nomor KK.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 items-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={e=>setFile(e.target.files?.[0]||null)}
                className="w-full min-w-0 border rounded-xl p-3 text-xs"
              />

              <button
                onClick={previewExcel}
                disabled={busy}
                className="w-full sm:w-auto bg-blue-600 text-white rounded-xl px-4 py-3 font-bold whitespace-nowrap"
              >
                Preview Excel
              </button>

              <button
                onClick={exportExcel}
                disabled={busy || !data.length}
                className="w-full sm:w-auto bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold whitespace-nowrap"
              >
                Export Excel
              </button>

              <button
                onClick={exportPdf}
                disabled={busy || !data.length}
                className="w-full sm:w-auto bg-red-600 text-white rounded-xl px-4 py-3 font-bold whitespace-nowrap"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {show && (
          <form onSubmit={save} className="bg-white border rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between gap-3 mb-5"><h2 className="text-lg font-black">{editingId ? "Edit Data Warga" : "Form Lengkap Data Warga"}</h2>{editingId && <button type="button" onClick={()=>{setEditingId(null);setForm(initial);setShow(false);}} className="text-sm font-bold text-slate-500 hover:text-red-600">Batal Edit</button>}</div>

            <Group title="1. Identitas & KK">
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="NIK *" value={form.nik} onChange={v=>set("nik",v)} required/>
                <Field label="No. KK" value={form.nomorKK} onChange={v=>set("nomorKK",v)}/>
                <Field label="Daerah KK Asal" value={form.daerahKKAsal} onChange={v=>set("daerahKKAsal",v)} placeholder="Contoh: Karawang, Jawa Barat"/>
                <Field label="Nama Lengkap *" value={form.nama} onChange={v=>set("nama",v)} required/>
                <Select label="Status Hubungan Keluarga *" value={form.hubunganKeluarga} onChange={v=>set("hubunganKeluarga",v)} options={hubungan}/>
                <Select label="Jenis Kelamin *" value={form.jenisKelamin} onChange={v=>set("jenisKelamin",v)} options={[["LAKI_LAKI","Laki-laki"],["PEREMPUAN","Perempuan"]]}/>
                <Select label="Status Tinggal" value={form.statusTinggal} onChange={v=>set("statusTinggal",v)} options={tinggal}/>
                <Field label="Alamat" value={form.alamat} onChange={v=>set("alamat",v)}/>
                <Field label="RT" value={form.rt} onChange={v=>set("rt",v)}/>
                <Field label="RW" value={form.rw} onChange={v=>set("rw",v)}/>
              </div>
            </Group>

            <Group title="2. Kelahiran">
              <div className="grid md:grid-cols-4 gap-3">
                <Field label="Tempat Lahir" value={form.tempatLahir} onChange={v=>set("tempatLahir",v)}/>
                <Field label="Tanggal Lahir" type="date" value={form.tanggalLahir}
                  onChange={v=>setForm(x=>({...x,tanggalLahir:v,usia:age(v)}))}/>
                <Field label="Usia (otomatis)" value={form.usia} onChange={()=>{}} readOnly/>
                <Field label="Golongan Darah" value={form.golonganDarah} onChange={v=>set("golonganDarah",v)} placeholder="A / B / AB / O"/>
              </div>
            </Group>

            <Group title="3. Pendidikan, Agama & Pekerjaan">
              <div className="grid md:grid-cols-4 gap-3">
                <Select label="Agama" value={form.agama} onChange={v=>set("agama",v)} options={agama}/>
                <Select label="Pendidikan / Sekolah Terakhir" value={form.pendidikan} onChange={v=>set("pendidikan",v)} options={pendidikan}/>
                <Field label="Jenis Pekerjaan" value={form.pekerjaan} onChange={v=>set("pekerjaan",v)}/>
                <Select label="Status Perkawinan" value={form.statusKawin} onChange={v=>set("statusKawin",v)} options={kawin}/>
              </div>
            </Group>

            <Group title="4. Orang Tua">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Nama Ibu" value={form.namaIbu} onChange={v=>set("namaIbu",v)}/>
                <Field label="Nama Ayah" value={form.namaAyah} onChange={v=>set("namaAyah",v)}/>
              </div>
            </Group>

            <Group title="5. Dokumen & Data Hubungan">
              <div className="grid md:grid-cols-4 gap-3">
                <Field label="No. Paspor" value={form.nomorPaspor} onChange={v=>set("nomorPaspor",v)}/>
                <Field label="Tanggal Akhir Paspor" type="date" value={form.tanggalAkhirPaspor} onChange={v=>set("tanggalAkhirPaspor",v)}/>
                <Field label="Hubungan" value={form.hubungan} onChange={v=>set("hubungan",v)}/>
                <Field label="Kode Hubungan" value={form.kodeHubungan} onChange={v=>set("kodeHubungan",v)}/>
              </div>
            </Group>

            <button disabled={busy} className="bg-blue-600 text-white rounded-xl px-6 py-3 font-bold">
              {busy ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "OK Simpan Data Warga"}
            </button>
          </form>
        )}

        {preview.length>0 && (
          <section className="bg-white border rounded-2xl p-5 mb-5">
            <div className="flex flex-col md:flex-row justify-between gap-3 items-start md:items-center">
              <div>
                <h2 className="font-black text-lg">Preview Import Lengkap</h2>
                <p className="text-xs text-slate-500">{preview.length} warga • {cols.length} kolom</p>
              </div>
              <button onClick={importRows} disabled={busy} className="bg-emerald-600 text-white rounded-xl px-5 py-3 font-bold">
                OK Simpan ke Database
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4">
              {completeness().map(x=>(
                <div key={x.key} className={`rounded-xl border p-3 ${x.count===x.total?"bg-emerald-50 border-emerald-200":"bg-amber-50 border-amber-200"}`}>
                  <div className="text-xs font-bold">{x.count===x.total?"OK":"PERINGATAN"} {x.label}</div>
                  <div className="text-sm font-black mt-1">{x.count}/{x.total}</div>
                </div>
              ))}
            </div>

            <div className="rt11-scroll-note text-[10px] leading-4 sm:text-xs">
              • Scroll vertikal juga tersedia di kiri.  Gunakan scrollbar atas untuk geser ke kanan.
              <b> NIK dan Nama Lengkap tetap menempel.</b>
            </div>

            <TableScroller
              topRef={previewTop}
              bodyRef={previewBody}
              leftRef={previewLeft}
              leftInnerRef={previewLeftInner}
            >
              <table className="rt11-table text-xs">
                <thead>
                  <tr>
                    {cols.map(([key,label],i)=>(
                      <th key={key} className={`p-2 text-left whitespace-nowrap border-b font-bold ${
                        i===0?"rt11-sticky-nik":i===1?"rt11-sticky-nama":""
                      }`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((x,i)=>(
                    <tr key={`${x.nik}-${i}`} className="border-b hover:bg-slate-50">
                      {cols.map(([key],j)=>(
                        <td key={key} className={`p-2 whitespace-nowrap ${
                          j===0?"rt11-sticky-nik":j===1?"rt11-sticky-nama":""
                        }`}>
                          {x[key]==null || String(x[key]).trim()==="" ? "-" : String(x[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroller>

            {errors.length>0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 text-xs">
                <div className="font-bold mb-1">Catatan validasi:</div>
                {errors.map(x=><div key={x}>• {x}</div>)}
              </div>
            )}
          </section>
        )}

        <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                    👥
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900">Daftar Warga</h2>
                    <p className="text-xs text-slate-500">
                      {data.length} data tersimpan
                      {q && ` • ${filtered.length} ditemukan`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative w-full lg:w-96">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>
                <input
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                  placeholder="Cari NIK, nama, No KK..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                {q && (
                  <button
                    type="button"
                    onClick={()=>setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="space-y-3 p-3 sm:p-4 md:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <div className="text-3xl">👥</div>
                <p className="mt-3 font-bold text-slate-700">
                  Belum ada data warga
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Coba ubah kata pencarian atau tambahkan warga baru.
                </p>
              </div>
            ) : (
              filtered.map(x=>(
                <article
                  key={x.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                      👤
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-900">
                        {x.nama || "-"}
                      </h3>
                      <p className="mt-0.5 text-xs font-mono text-slate-500">
                        NIK: {x.nik || "-"}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      x.statusTinggal === "TETAP"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {x.statusTinggal === "TETAP"
                        ? "TETAP"
                        : String(x.statusTinggal || "-")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-100">
                    <div className="bg-white p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        No. KK
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                        {x.nomorKK || "-"}
                      </p>
                    </div>

                    <div className="bg-white p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Hubungan
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                        {x.hubunganKeluarga || "-"}
                      </p>
                    </div>

                    <div className="bg-white p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Jenis Kelamin
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                        {x.jenisKelamin === "LAKI_LAKI"
                          ? "Laki-laki"
                          : x.jenisKelamin === "PEREMPUAN"
                            ? "Perempuan"
                            : x.jenisKelamin || "-"}
                      </p>
                    </div>

                    <div className="bg-white p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Usia
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {x.usia ? `${x.usia} tahun` : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-4">
                    <div className="space-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="w-20 shrink-0 text-slate-400">
                          Alamat
                        </span>
                        <span className="font-medium text-slate-700">
                          {x.alamat || "-"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <span className="w-20 shrink-0 text-slate-400">
                          Lahir
                        </span>
                        <span className="font-medium text-slate-700">
                          {x.tempatLahir || "-"}
                          {x.tanggalLahir
                            ? ` • ${new Date(x.tanggalLahir).toLocaleDateString("id-ID")}`
                            : ""}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <span className="w-20 shrink-0 text-slate-400">
                          Pekerjaan
                        </span>
                        <span className="font-medium text-slate-700">
                          {x.pekerjaan || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={()=>editWarga(x)}
                        disabled={busy}
                        className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition active:scale-[.98] hover:bg-blue-100 disabled:opacity-50"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        onClick={()=>deleteWarga(x)}
                        disabled={busy}
                        className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition active:scale-[.98] hover:bg-red-100 disabled:opacity-50"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden min-w-0 px-2 pb-3 sm:px-5 sm:pb-5 md:block">
            <div className="rt11-scroll-note text-[10px] leading-4 sm:text-xs">
              • Scroll vertikal di kiri &nbsp;•&nbsp; Scroll horizontal di atas
              &nbsp;•&nbsp; <b>NIK dan Nama Lengkap sticky</b>
            </div>

            <TableScroller
              topRef={listTop}
              bodyRef={listBody}
              leftRef={listLeft}
              leftInnerRef={listLeftInner}
            >
              <table className="rt11-table text-[11px] sm:text-sm">
                <thead>
                  <tr>
                    {cols.map(([key,label],i)=>(
                      <th key={key} className={`p-2 text-left whitespace-nowrap sm:p-3 ${
                        i===0?"rt11-sticky-nik":i===1?"rt11-sticky-nama":""
                      }`}>{label}</th>
                    ))}
                    <th className="p-2 text-left whitespace-nowrap border-l bg-slate-50 sm:p-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(x=>(
                    <tr key={x.id} className="border-t hover:bg-blue-50/40">
                      {cols.map(([key],j)=>{
                        let v=x[key];
                        if(key==="tanggalLahir" || key==="tanggalAkhirPaspor")
                          v=v ? new Date(v).toLocaleDateString("id-ID") : "";
                        return <td key={key} className={`p-2 whitespace-nowrap sm:p-3 ${
                          j===0?"rt11-sticky-nik":j===1?"rt11-sticky-nama":""
                        }`}>{v || "-"}</td>;
                      })}

                      <td className="p-2 bg-white border-l sm:p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={()=>editWarga(x)}
                            disabled={busy}
                            className="min-h-9 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={()=>deleteWarga(x)}
                            disabled={busy}
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={cols.length + 1} className="p-8 text-center text-slate-400">
                        Belum ada data warga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableScroller>
          </div>
        </section>
      </div>
    </main>
  );
}

function TableScroller({
  topRef, bodyRef, leftRef, leftInnerRef, children
}:{
  topRef:React.RefObject<HTMLDivElement|null>;
  bodyRef:React.RefObject<HTMLDivElement|null>;
  leftRef:React.RefObject<HTMLDivElement|null>;
  leftInnerRef:React.RefObject<HTMLDivElement|null>;
  children:ReactNode;
}) {
  return (
    <div className="rt11-table-wrap">
      <div ref={topRef} className="rt11-top-scroll" aria-label="Scroll horizontal">
        <div className="rt11-top-inner" />
      </div>

      <div ref={leftRef} className="rt11-left-scroll" aria-label="Scroll vertikal kiri">
        <div ref={leftInnerRef} className="rt11-left-inner" />
      </div>

      <div ref={bodyRef} className="rt11-body-scroll">
        {children}
      </div>
    </div>
  );
}

function Group({title,children}:{title:string;children:ReactNode}) {
  return <div className="mb-6"><h3 className="font-bold text-sm mb-3">{title}</h3>{children}</div>;
}

function Field({
  label,value,onChange,type="text",placeholder="",required=false,readOnly=false
}:{
  label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;required?:boolean;readOnly?:boolean
}) {
  return <label className="block">
    <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
    <input type={type} required={required} readOnly={readOnly} value={value} placeholder={placeholder}
      onChange={e=>onChange(e.target.value)}
      className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm ${readOnly?"bg-slate-50":""}`}/>
  </label>;
}

function Select({
  label,value,onChange,options
}:{
  label:string;value:string;onChange:(v:string)=>void;options:string[][]
}) {
  return <label className="block">
    <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white">
      <option value="">-- Pilih --</option>
      {options.map(([v,t])=><option key={v} value={v}>{t}</option>)}
    </select>
  </label>;
}


























