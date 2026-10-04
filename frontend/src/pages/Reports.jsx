import React, { useEffect, useState } from "react";
import { api, formatPKR } from "@/lib/api";
import { Eye, Trash2, Search } from "lucide-react";
import ReportPreview from "@/components/ReportPreview";

export default function Reports() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(null);

  const load = async () => {
    const { data } = await api.get("/reports");
    setList(data);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm("Delete this report?")) return;
    await api.delete(`/reports/${id}`);
    load();
  };

  const filtered = list.filter(r =>
    [r.report_no, r.patient_snapshot?.name, r.patient_snapshot?.mr_number].some(f => (f||"").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Report History</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">All Reports</h1>
        <p className="text-slate-500 text-sm mt-1">{list.length} total reports generated</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search by report no, patient name or MR..."
          value={q} onChange={e=>setQ(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">Report No</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num font-semibold text-slate-900">{r.report_no}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.patient_snapshot?.name}</div>
                    <div className="text-xs text-slate-500 font-mono-num">{r.patient_snapshot?.mr_number}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.results?.length}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatPKR(r.total_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={()=>setActive(r)} className="inline-flex items-center gap-1 text-rose-700 hover:underline text-xs font-semibold mr-3"><Eye size={14}/>View</button>
                    <button onClick={()=>remove(r.id)} className="text-slate-400 hover:text-rose-700"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">No reports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {active && <ReportPreview report={active} onClose={()=>setActive(null)} />}
    </div>
  );
}
