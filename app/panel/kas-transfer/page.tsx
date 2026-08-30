"use client";
import RtInfo from "../../ui/rt-info";

import { FormEvent, useEffect, useState } from "react";

const money=(n:number)=>new Intl.NumberFormat("id-ID",{
  style:"currency",currency:"IDR",maximumFractionDigits:0
}).format(n);

export default function TransferKasTaktisPage(){
  const [amount,setAmount]=useState("");
  const [description,setDescription]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [history,setHistory]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    const r=await fetch("/api/kas/transfer-taktis",{cache:"no-store"});
    const j=await r.json();
    if(r.ok)setHistory(Array.isArray(j)?j:[]);
  }

  useEffect(()=>{load()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const r=await fetch("/api/kas/transfer-taktis",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({amount,description,date})
    });

    const j=await r.json();
    setBusy(false);

    if(!r.ok){
      setMessage(j.error||"Transfer gagal.");
      return;
    }

    setMessage("OK Transfer Kas RT ' Dana Taktis berhasil.");
    setAmount("");
    setDescription("");
    await load();
  }

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600"><RtInfo /></p>
          <h1 className="text-3xl font-black mt-1">Transfer Kas ' Dana Taktis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pemindahan dana otomatis tercatat di kedua pembukuan.
          </p>
        </div>
        <a href="/panel" className="text-blue-600 font-bold text-sm"> Kembali</a>
      </header>

      {message&&<div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">{message}</div>}

      <section className="bg-white border rounded-2xl p-6 mb-5">
        <div className="grid md:grid-cols-3 gap-3 items-center mb-6">
          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <div className="text-xs text-slate-500">Sumber</div>
            <div className="text-xl font-black mt-1">'° Kas RT</div>
          </div>
          <div className="text-center text-3xl font-black text-blue-600">'</div>
          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <div className="text-xs text-slate-500">Tujuan</div>
            <div className="text-xl font-black mt-1">›¡ï¸ Dana Taktis</div>
          </div>
        </div>

        <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 items-end">
          <label>
            <span className="label">Nominal Transfer</span>
            <input required value={amount}
              onChange={e=>setAmount(e.target.value.replace(/\D/g,""))}
              placeholder="1000000" className="input"/>
          </label>

          <label>
            <span className="label">Tanggal</span>
            <input type="date" value={date}
              onChange={e=>setDate(e.target.value)} className="input"/>
          </label>

          <button disabled={busy} className="rounded-xl bg-blue-600 text-white px-4 py-3 font-bold">
            {busy?"Memproses...":"Transfer Dana"}
          </button>

          <label className="md:col-span-3">
            <span className="label">Alasan / Keterangan</span>
            <input value={description}
              onChange={e=>setDescription(e.target.value)}
              placeholder="Contoh: alokasi dana taktis bulan September"
              className="input"/>
          </label>
        </form>

        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
          Transfer akan membuat <b>pengeluaran</b> di Kas RT dan <b>pemasukan</b> di Dana Taktis dengan nominal yang sama. Sistem menggunakan transaksi database agar keduanya berhasil atau keduanya batal.
        </div>
      </section>

      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5">
          <h2 className="font-black text-lg">Histori Transfer</h2>
          <p className="text-xs text-slate-500">{history.length} transfer</p>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Tanggal</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {history.map(x=><tr key={x.id} className="border-t">
                <td className="p-3">{new Date(x.date).toLocaleDateString("id-ID")}</td>
                <td className="p-3 text-right font-bold">{money(x.amount)}</td>
                <td className="p-3">{x.description||"-"}</td>
              </tr>)}
              {!history.length&&<tr><td colSpan={3} className="p-10 text-center text-slate-400">Belum ada transfer.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <style jsx>{`
      .input{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px 12px;background:white}
      .label{display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:5px}
    `}</style>
  </main>
}






