import React, { useEffect, useState } from "react";
import { api, formatPKR } from "@/lib/api";
import { Users, FileText, TrendingUp, AlertTriangle, Activity, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const KPI = ({ icon: Icon, label, value, sub, color, testid }) => (
  <div data-testid={testid} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-2 font-display text-3xl font-black text-slate-900 font-mono-num">{value}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      </div>
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get("/dashboard/stats");
        setStats(s.data);
        const r = await api.get("/reports");
        setRecent(r.data.slice(0, 6));
      } catch (e) { console.error(e); }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Dashboard</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">Lab Overview</h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time snapshot of your clinical operations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Calendar size={16} /> {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI testid="kpi-patients-today" icon={Users} label="Total Patients" value={stats?.total_patients ?? "—"} sub="Registered records" color="bg-rose-50 text-rose-700" />
        <KPI testid="kpi-tests-today" icon={FileText} label="Reports Today" value={stats?.reports_today ?? "—"} sub={`${stats?.total_reports ?? 0} all-time`} color="bg-teal-50 text-teal-700" />
        <KPI testid="kpi-revenue-pkr" icon={TrendingUp} label="Revenue Today" value={formatPKR(stats?.revenue_today ?? 0)} sub={`${formatPKR(stats?.revenue_total ?? 0)} total`} color="bg-emerald-50 text-emerald-700" />
        <KPI testid="kpi-pending-abnormal" icon={AlertTriangle} label="Abnormal Reports" value={stats?.abnormal_results ?? "—"} sub="Flagged for review" color="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Recent Reports</h3>
            <Link to="/reports" className="text-xs font-semibold text-rose-700 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">No reports yet. Create your first one.</div>}
            {recent.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{r.patient_snapshot?.name}</div>
                  <div className="text-xs text-slate-500 font-mono-num">{r.report_no} · {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num font-semibold text-slate-900">{formatPKR(r.total_amount)}</div>
                  <div className="text-xs text-slate-500">{r.results?.length} test{r.results?.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5">
          <Activity size={24} className="text-rose-400" />
          <h3 className="font-display font-bold text-lg mt-3">Quick Actions</h3>
          <p className="text-slate-300 text-sm mt-1">Fast access to common workflows.</p>
          <div className="mt-5 space-y-2">
            <Link to="/reports/new" className="block px-4 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 font-semibold text-sm transition">+ Create New Report</Link>
            <Link to="/patients" className="block px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium text-sm transition">Manage Patients</Link>
            <Link to="/catalog" className="block px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium text-sm transition">Test Catalog</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
