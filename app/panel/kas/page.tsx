"use client";
import RtInfo from "../../ui/rt-info";

import { FormEvent,useEffect,useMemo,useState } from "react";

type Row={id:string;type:"PEMASUKAN"|"PENGELUARAN";amount:number;category:string;description:string|null;date:string};

const pemasukan=["Iuran Warga","Sumbangan","Donasi","Pendapatan Kegiatan","Bunga/Administrasi","Lainnya"];
const pengeluaran=["Sampah","Kebersihan","Keamanan","Lingkungan","Kegiatan RT","Konsumsi","Santunan","Administrasi","Perbaikan","Lainnya"];
const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);

export default function KasPage(){
  function apiHeaders(extra?: Record<string, string>) {
    const headers: Record<string, string> = { ...(extra || {}) };
    const role = localStorage.getItem("rt_role");
    const activeRT = localStorage.getItem("rt_superadmin_active");

    if (role === "superadmin" && activeRT) {
      headers["x-rt-unit-id"] = activeRT;
    }

    return headers;
  }
  const [rows,setRows]=useState<Row[]>([]);
  const [summary,setSummary]=useState({pemasukan:0,pengeluaran:0,saldo:0});
  const [type,setType]=useState<"PEMASUKAN"|"PENGELUARAN">("PEMASUKAN");
  const [amount,setAmount]=useState("");
  const [category,setCategory]=useState(pemasukan[0]);
  const [description,setDescription]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [query,setQuery]=useState("");
  const [month,setMonth]=useState("");
  const [edit,setEdit]=useState<Row|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    const r=await fetch("/api/kas",{cache:"no-store",credentials:"include",headers:apiHeaders()});
    const j=await r.json();
    if(r.ok){setRows(j.rows||[]);setSummary(j.summary||{pemasukan:0,pengeluaran:0,saldo:0})}
    else setMessage(j.error||"Gagal membaca Kas RT.");
  }
  useEffect(()=>{load()},[]);

  useEffect(()=>{
    setCategory((type==="PEMASUKAN"?pemasukan:pengeluaran)[0]);
  },[type]);

  const filtered=useMemo(()=>{
    return rows.filter(r=>{
      const text=`${r.category} ${r.description||""} ${r.type}`.toLowerCase();
      const okQ=!query||text.includes(query.toLowerCase());
      const okM=!month||r.date.slice(0,7)===month;
      return okQ&&okM;
    });
  },[rows,query,month]);

  const filteredIn=filtered.filter(x=>x.type==="PEMASUKAN").reduce((s,x)=>s+x.amount,0);
  const filteredOut=filtered.filter(x=>x.type==="PENGELUARAN").reduce((s,x)=>s+x.amount,0);

  function reset(){
    setAmount("");setDescription("");setEdit(null);
    setType("PEMASUKAN");setCategory(pemasukan[0]);
    setDate(new Date().toISOString().slice(0,10));
  }

  function startEdit(r:Row){
    setEdit(r);setType(r.type);setAmount(String(r.amount));setCategory(r.category);
    setDescription(r.description||"");setDate(r.date.slice(0,10));
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    const r = await fetch("/api/kas", {
  method: edit ? "PATCH" : "POST",
  headers: {
    "Content-Type": "application/json", "x-rt-unit-id": localStorage.getItem("rt_superadmin_active") || "",
  },
  body: JSON.stringify({
    id: edit?.id,
    type,
    amount,
    category,
    description,
    date,
  }),
});

const responseText = await r.text();

let j: any = {};

try {
  j = responseText
    ? JSON.parse(responseText)
    : {};
} catch {
  j = {
    error: responseText || "Server mengembalikan response yang tidak valid.",
  };
}

setBusy(false);

if (!r.ok) {
  setMessage(
    j.error ||
    j.detail ||
    `Gagal menyimpan transaksi. HTTP ${r.status}`
  );
  return;
}

setMessage(
  edit
    ? "Transaksi berhasil diperbarui."
    : "Transaksi berhasil ditambahkan."
);

reset();
await load();
  }

  async function remove(id:string){
    if(!confirm("Hapus transaksi ini?"))return;
    const r=await fetch(`/api/kas?id=${encodeURIComponent(id)}`,{method:"DELETE",credentials:"include",headers:apiHeaders()});
    const j=await r.json();
    if(!r.ok){setMessage(j.error||"Gagal menghapus.");return}
    setMessage("Transaksi berhasil dihapus.");load();
  }

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="max-w-[1450px] mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div><p className="text-xs font-bold tracking-widest text-blue-600"><RtInfo /></p>
          <h1 className="text-3xl font-black mt-1">Kas RT</h1>
          <p className="text-sm text-slate-500">Pembukuan pemasukan dan pengeluaran <RtInfo mode="short" />.</p></div>
        <a href="/panel" className="text-blue-600 font-bold text-sm">Kembali</a>
      </header>

      {message&&<div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">{message}</div>}

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        <Card title="Total Pemasukan" value={summary.pemasukan}/>
        <Card title="Total Pengeluaran" value={summary.pengeluaran}/>
        <Card title="Saldo Kas RT" value={summary.saldo} strong/>
      </div>

      <section className="bg-white border rounded-2xl p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-lg font-black">{edit?"Edit Transaksi":"Tambah Transaksi"}</h2>
          <p className="text-xs text-slate-500">Kas RT berdiri sendiri dan tidak terhubung dengan Dana Taktis.</p></div>
          {edit&&<button onClick={reset} className="border rounded-xl px-4 py-2 text-sm font-bold">Batal Edit</button>}
        </div>
        <form onSubmit={save} className="grid md:grid-cols-5 gap-3 items-end">
          <label><span className="label">Jenis</span><select value={type} onChange={e=>setType(e.target.value as any)} className="input">
            <option value="PEMASUKAN">Pemasukan</option><option value="PENGELUARAN">Pengeluaran</option>
          </select></label>
          <label><span className="label">Nominal</span><input required value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))} placeholder="100000" className="input"/></label>
          <label><span className="label">Kategori</span><select value={category} onChange={e=>setCategory(e.target.value)} className="input">
            {(type==="PEMASUKAN"?pemasukan:pengeluaran).map(x=><option key={x}>{x}</option>)}
          </select></label>
          <label><span className="label">Tanggal</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="input"/></label>
          <button disabled={busy} className={`rounded-xl px-4 py-3 font-bold text-white ${type==="PEMASUKAN"?"bg-emerald-600":"bg-red-600"}`}>{busy?"Menyimpan...":edit?"Simpan Perubahan":"Simpan Transaksi"}</button>
          <label className="md:col-span-5"><span className="label">Keterangan</span><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Keterangan transaksi..." className="input"/></label>
        </form>
      </section>

      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <div><h2 className="text-lg font-black">Histori Kas RT</h2><p className="text-xs text-slate-500">{filtered.length} transaksi ditampilkan</p></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="input sm:w-44"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kategori/keterangan..." className="input sm:w-72"/>
              <button onClick={()=>{setMonth("");setQuery("")}} className="border rounded-xl px-4 py-2 text-sm font-bold">Reset</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Mini label="Pemasukan Filter" value={filteredIn}/>
            <Mini label="Pengeluaran Filter" value={filteredOut}/>
            <Mini label="Selisih Filter" value={filteredIn-filteredOut}/>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Jenis</th><th className="p-3 text-left">Kategori</th>
              <th className="p-3 text-left">Keterangan</th><th className="p-3 text-right">Nominal</th><th className="p-3 text-center">Aksi</th>
            </tr></thead>
            <tbody>{filtered.map(r=><tr key={r.id} className="border-t">
              <td className="p-3">{new Date(r.date).toLocaleDateString("id-ID")}</td>
              <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${r.type==="PEMASUKAN"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{r.type==="PEMASUKAN"?"PEMASUKAN":"PENGELUARAN"}</span></td>
              <td className="p-3">{r.category}</td><td className="p-3">{r.description||"-"}</td>
              <td className={`p-3 text-right font-bold ${r.type==="PEMASUKAN"?"text-emerald-700":"text-red-700"}`}>{r.type==="PEMASUKAN"?"+ ":"- "}{money(r.amount)}</td>
              <td className="p-3 text-center whitespace-nowrap"><button onClick={()=>startEdit(r)} className="text-blue-600 font-bold mr-4">Edit</button><button onClick={()=>remove(r.id)} className="text-red-600 font-bold">Hapus</button></td>
            </tr>)}
            {!filtered.length&&<tr><td colSpan={6} className="p-10 text-center text-slate-400">Belum ada transaksi.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
    <style jsx>{`.input{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px 12px;background:white}.label{display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:5px}`}</style>
  </main>
}

function Card({title,value,strong=false}:{title:string;value:number;strong?:boolean}){return <div className="bg-white border rounded-2xl p-5"><div className="text-xs text-slate-500">{title}</div><div className={`text-2xl mt-1 ${strong?"font-black":"font-bold"}`}>{money(value)}</div></div>}
function Mini({label,value}:{label:string;value:number}){return <div className="bg-slate-50 rounded-xl p-3"><div className="text-[11px] text-slate-500">{label}</div><div className="font-black">{money(value)}</div></div>}








