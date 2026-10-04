import React, { useEffect, useState, useMemo } from "react";
import { api, formatPKR } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

export default function Analytics() {
  const [patients, setPatients] = useState([]);
  const [pid, setPid] = useState("");
  const [history, setHistory] = useState([]);
  const [param, setParam] = useState("");

  useEffect(() => {
    (async () => {
      const p = await api.get("/patients");
      setPatients(p.data);
    })();
  }, []);

  useEffect(() => {
    if (!pid) { setHistory([]); return; }
    (async () => {
      const { data } = await api.get(`/patients/${pid}/history`);
      setHistory(data);
    })();
  }, [pid]);

  const paramOptions = useMemo(() => {
    const set = new Set();
    history.forEach(r => r.results.forEach(res => res.parameters.forEach(p => set.add(p.name))));
    return Array.from(set);
  }, [history]);

  useEffect(() => {
    if (paramOptions.length && !paramOptions.includes(param)) setParam(paramOptions[0]);
  }, [paramOptions]);

  const chartData = useMemo(() => {
    const rows = [];
    [...history].reverse().forEach(r => {
      r.results.forEach(res => {
        res.parameters.forEach(p => {
          if (p.name === param) {
            const num = parseFloat(p.value);
            if (!isNaN(num)) rows.push({ date: new Date(r.created_at).toLocaleDateString(), value: num, unit: p.unit });
          }
        });
      });
    });
    return rows;
  }, [history, param]);

  const refBounds = useMemo(() => {
    for (const r of history) for (const res of r.results) for (const p of res.parameters) {
      if (p.name === param && p.ref) {
        const m = /(-?\d+\.?\d*)\s*[-–]\s*(-?\d+\.?\d*)/.exec(p.ref);
        if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
      }
    }
    return null;
  }, [history, param]);

  const patient = patients.find(p => p.id === pid);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Trend Analytics</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">Patient Test Trends</h1>
        <p className="text-slate-500 text-sm mt-1">Visualize how a parameter evolves across multiple reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          data-testid="patient-trend-select-patient"
          value={pid} onChange={e=>setPid(e.target.value)}
          className="h-11 px-3 rounded-lg bg-white border border-slate-200"
        >
          <option value="">— Select patient —</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.mr_number} · {p.name}</option>)}
        </select>
        <select
          data-testid="patient-trend-select-test"
          value={param} onChange={e=>setParam(e.target.value)}
          disabled={!pid}
          className="h-11 px-3 rounded-lg bg-white border border-slate-200 disabled:opacity-50"
        >
          <option value="">— Select parameter —</option>
          {paramOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        {!patient && <div className="text-center py-16 text-slate-400"><TrendingUp size={32} className="mx-auto mb-2 opacity-50"/><div className="text-sm">Choose a patient to view trends.</div></div>}
        {patient && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-bold text-xl">{patient.name}</div>
                <div className="text-xs text-slate-500 font-mono-num">{patient.mr_number} · {history.length} report{history.length !== 1 ? "s" : ""}</div>
              </div>
              {chartData.length > 0 && <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Latest</div>
                <div className="font-mono-num text-2xl font-black">{chartData[chartData.length-1].value} <span className="text-xs text-slate-500">{chartData[chartData.length-1].unit}</span></div>
              </div>}
            </div>
            <div data-testid="patient-trend-line-chart" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
                  <YAxis tick={{ fontSize: 11 }}/>
                  <Tooltip />
                  {refBounds && <ReferenceArea y1={refBounds.low} y2={refBounds.high} fill="#10B981" fillOpacity={0.08} label={{ value: "Normal", fontSize: 10, fill: "#059669" }}/>}
                  <Line type="monotone" dataKey="value" stroke="#BE123C" strokeWidth={2.5} dot={{ r: 5, fill: "#BE123C" }} activeDot={{ r: 7 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            {chartData.length === 0 && <div className="text-center text-sm text-slate-500 mt-4">No numeric data for the selected parameter yet.</div>}
          </>
        )}
      </div>
    </div>
  );
}
