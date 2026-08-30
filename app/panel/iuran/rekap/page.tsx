"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";

const rp=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);

export default function RekapIuranPage(){
  const router=useRouter();
  const [periode,setPeriode]=useState(new Date().toISOString().slice(0,7));
  const [data,setData]=useState<any>(null);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await fetch(`/api/iuran/rekap?periode=${periode}`,{cache:"no-store"});
      const text=await r.text(); let d:any={};
      try{d=text?JSON.parse(text):{};}catch{throw new Error("Response API rekap tidak valid.");}
      if(!r.ok) throw new Error(d.error||"Gagal mengambil rekap.");
      setData(d);
    }catch(e){alert(e instanceof Error?e.message:"Gagal mengambil rekap.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{
    const role=localStorage.getItem("rt_role");
    if(!role||!["ketua","bendahara"].includes(role)){router.replace("/panel");return;}
    load();
  },[periode]);

  const filtered=useMemo(()=>{
    if(!data)return[];
    const q=search.toLowerCase().trim();
    return q?data.transaksi.filter((x:any)=>x.kepalaKeluarga.toLowerCase().includes(q)||x.nomorKK.toLowerCase().includes(q)):data.transaksi;
  },[data,search]);

  function exportCsv(){
    if(!data)return;
    const rows=[
      ["No. KK","Kepala Keluarga","Alamat","Nominal","Status","Metode","Tanggal Bayar","Catatan"],
      ...data.transaksi.map((x:any)=>[x.nomorKK,x.kepalaKeluarga,x.alamat,x.amount,x.status,x.method||"",x.paidAt?new Date(x.paidAt).toLocaleString("id-ID"):"",x.note||""])
    ];
    const csv=rows.map((r:any[])=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`rekap-iuran-${periode}.csv`;a.click();
  }

  if(loading)return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6">Memuat rekap iuran...</div></main>;
  if(!data)return null;

  return <main className="min-h-screen bg-slate-50">
    <header className="bg-blue-700 text-white"><div className="mx-auto flex max-w-6xl justify-between px-4 py-5">
      <div><div className="text-xl font-black">Rekap Iuran</div><div className="text-xs text-blue-100">Iuran per Kepala Keluarga</div></div>
      <button onClick={()=>router.push("/panel/iuran")} className="rounded-xl bg-white/15 px-4 py-2 text-sm"> Iuran</button>
    </div></header>
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border bg-white p-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-black">Rekap Periode</h1><p className="text-xs text-slate-500">Terpisah dari Kas RT dan Dana Taktis.</p></div>
        <input type="month" value={periode} onChange={e=>setPeriode(e.target.value)} className="rounded-xl border px-3 py-2"/>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["KK wajib bayar",data.totalKK],["Sudah bayar",data.sudahBayar],["Belum bayar",data.belumBayar],["Total diterima",rp(data.totalDiterima)],["Sisa tagihan",rp(data.sisaTagihan)]].map(([a,b])=><div key={String(a)} className="rounded-2xl border bg-white p-4"><div className="text-xs text-slate-500">{a}</div><div className="mt-1 text-xl font-black">{b}</div></div>)}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-black">Riwayat Pembayaran</h2><p className="text-xs text-slate-500">Pembayaran yang tercatat pada periode ini.</p></div>
        <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari KK / kepala keluarga" className="rounded-xl border px-3 py-2"/><button onClick={exportCsv} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Export CSV</button></div></div>
        <div className="mt-4 overflow-auto rounded-xl border"><table className="min-w-[900px] w-full text-sm"><thead className="bg-slate-50"><tr>{["No. KK","Kepala Keluarga","Alamat","Nominal","Status","Metode","Tanggal Bayar"].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((x:any)=><tr key={x.id} className="border-t"><td className="px-3 py-3">{x.nomorKK}</td><td className="px-3 py-3 font-semibold">{x.kepalaKeluarga}</td><td className="px-3 py-3">{x.alamat}</td><td className="px-3 py-3">{rp(x.amount)}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">LUNAS</span></td><td className="px-3 py-3">{x.method||"-"}</td><td className="px-3 py-3">{x.paidAt?new Date(x.paidAt).toLocaleString("id-ID"):"-"}</td></tr>)}
        {!filtered.length&&<tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">Belum ada pembayaran.</td></tr>}</tbody></table></div>
      </section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">QRIS Pembayaran</h2><p className="text-xs text-slate-500 mt-1">QRIS terpisah dari Kas RT dan Dana Taktis.</p>
        <div className="mt-3"><b>{data.qris.merchantName||"Nama penerima belum diatur"}</b><div className="text-xs text-slate-500">{data.qris.qrisName||"QRIS belum diberi nama"}</div></div>
        {data.qris.active&&data.qris.imageUrl&&<img src={data.qris.imageUrl} alt="QRIS" className="mt-4 h-56 w-56 rounded-xl border object-contain"/>}
      </section>
    </div>
  </main>;
}




