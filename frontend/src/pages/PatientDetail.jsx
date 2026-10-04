import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatPKR } from "@/lib/api";
import { ArrowLeft, FileText } from "lucide-react";
import ReportPreview from "@/components/ReportPreview";

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      const p = await api.get(`/patients/${id}`);
      setPatient(p.data);
      const h = await api.get(`/patients/${id}/history`);
      setReports(h.data);
    })();
  }, [id]);

  if (!patient) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="max-w-7xl space-y-6">
      <Link to="/patients" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-rose-700"><ArrowLeft size={14}/> Back to patients</Link>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Patient Profile</div>
        <h1 className="font-display text-3xl font-black mt-1">{patient.name}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div><span className="text-slate-400">MR:</span> <span className="font-mono-num">{patient.mr_number}</span></div>
          <div><span className="text-slate-400">Age/Gender:</span> {patient.age}y · {patient.gender}</div>
          <div><span className="text-slate-400">Phone:</span> {patient.phone || "—"}</div>
          <div><span className="text-slate-400">Ref Dr:</span> {patient.referring_physician || "—"}</div>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-lg mb-3">Report History ({reports.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map(r => (
            <button key={r.id} onClick={()=>setActive(r)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="font-mono-num font-bold text-slate-900">{r.report_no}</div>
                <FileText size={16} className="text-rose-700"/>
              </div>
              <div className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-sm text-slate-700 mt-2">{r.results.length} test{r.results.length !== 1 ? "s" : ""} · {formatPKR(r.total_amount)}</div>
            </button>
          ))}
          {reports.length === 0 && <div className="col-span-2 text-slate-500 text-sm text-center py-10">No reports yet for this patient.</div>}
        </div>
      </div>

      {active && <ReportPreview report={active} onClose={()=>setActive(null)} />}
    </div>
  );
}
