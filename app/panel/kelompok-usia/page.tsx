"use client";
import RtInfo from "../../ui/rt-info";

import { useEffect, useMemo, useState } from "react";

type Member = {
  id:string; nik:string; nama:string; jenisKelamin:string;
  usia:number|null; tanggalLahir:string|null; statusTinggal:string;
  pekerjaan:string|null;
};
type Group = {
  key:string; label:string; min:number; max:number;
  total:number; lakiLaki:number; perempuan:number; members:Member[];
};

export default function KelompokUsiaPage(){
  const [groups,setGroups]=useState<Group[]>([]);
  const [total,setTotal]=useState(0);
  const [withAge,setWithAge]=useState(0);
  const [withoutAge,setWithoutAge]=useState(0);
  const [selected,setSelected]=useState<Group|null>(null);
  const [q,setQ]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const r=await fetch("/api/kelompok-usia",{cache:"no-store"});
    if(r.ok){
      const j=await r.json();
      setGroups(j.groups||[]);
      setTotal(j.totalWarga||0);
      setWithAge(j.totalDenganUsia||0);
      setWithoutAge(j.tanpaUsia||0);
    }
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  const members=useMemo(()=>{
    const list=selected?.members||[];
    const x=q.toLowerCase().trim();
    if(!x)return list;
    return list.filter(w=>`${w.nik} ${w.nama} ${w.pekerjaan||""}`.toLowerCase().includes(x));
  },[selected,q]);

  const max=Math.max(...groups.map(g=>g.total),1);

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div><h1 className="text-2xl font-black">Kelompok Usia</h1>
          <p className="text-sm text-slate-500">Pengelompokan otomatis berdasarkan tanggal lahir Data Warga <RtInfo mode="short" /></p></div>
        <a href="/panel" className="text-blue-600 font-bold text-sm"> Kembali</a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Total Warga" value={total}/>
        <Stat label="Usia Terbaca" value={withAge}/>
        <Stat label="Belum Ada Usia" value={withoutAge}/>
        <Stat label="Kelompok" value={groups.length}/>
      </div>

      <section className="bg-white border rounded-2xl p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="font-black text-lg">Distribusi Kelompok Usia</h2>
          <p className="text-xs text-slate-500">Klik kelompok untuk melihat daftar warga.</p></div>
          <button onClick={load} className="border rounded-xl px-4 py-2 text-sm font-bold">» Refresh</button>
        </div>

        {loading ? <div className="p-10 text-center text-slate-400">Memuat data...</div> :
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
          {groups.map(g=><button key={g.key} onClick={()=>{setSelected(g);setQ("")}}
            className={`text-left border rounded-2xl p-4 hover:border-blue-500 hover:bg-blue-50 ${selected?.key===g.key?"border-blue-600 bg-blue-50":""}`}>
            <div className="text-xs text-slate-500">{g.label}</div>
            <div className="text-3xl font-black mt-1">{g.total}</div>
            <div className="text-xs mt-2">Laki-laki {g.lakiLaki} &nbsp; Perempuan {g.perempuan}</div>
            <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{width:`${Math.max(4,g.total/max*100)}%`}}/>
            </div>
          </button>)}
        </div>}
      </section>

      {selected && <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5 border-b flex flex-col md:flex-row justify-between gap-3">
          <div><h2 className="font-black text-lg">{selected.label}</h2>
            <p className="text-xs text-slate-500">{selected.total} warga • Laki-laki {selected.lakiLaki} • Perempuan {selected.perempuan}</p></div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari NIK / nama..."
            className="border rounded-xl px-3 py-2.5 w-full md:w-72"/>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="p-3 text-left">NIK</th><th className="p-3 text-left">Nama</th>
              <th className="p-3 text-left">Usia</th><th className="p-3 text-left">JK</th>
              <th className="p-3 text-left">Pekerjaan</th><th className="p-3 text-left">Status Tinggal</th>
            </tr></thead>
            <tbody>{members.map(w=><tr key={w.id} className="border-t">
              <td className="p-3 font-mono">{w.nik}</td><td className="p-3 font-bold">{w.nama}</td>
              <td className="p-3">{w.usia??"-"}</td>
              <td className="p-3">{w.jenisKelamin==="PEREMPUAN"?"Perempuan":"Laki-laki"}</td>
              <td className="p-3">{w.pekerjaan||"-"}</td><td className="p-3">{w.statusTinggal||"-"}</td>
            </tr>)}
            {!members.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">Tidak ada data.</td></tr>}</tbody>
          </table>
        </div>
      </section>}

      {withoutAge>0 && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <b>Catatan:</b> {withoutAge} warga belum memiliki tanggal lahir/usia yang valid, sehingga belum masuk kelompok usia.
      </div>}
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:number}){
  return <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>
}






