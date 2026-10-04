import React, { useEffect, useMemo, useState } from "react";
import { api, formatPKR, flagForValue } from "@/lib/api";
import { Search, Trash2, Printer, Save, Beaker } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReportPreview from "@/components/ReportPreview";
import CommentSnippets from "@/components/CommentSnippets";

export default function NewReport() {
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [selected, setSelected] = useState([]); // [{test, values:{paramIdx: value}}]
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [savedReport, setSavedReport] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await api.get("/patients");
      setPatients(p.data);
      const t = await api.get("/tests");
      setTests(t.data);
    })();
  }, []);

  const patient = patients.find(p => p.id === patientId);
  const filtered = tests.filter(t =>
    q === "" || t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase())
  );
  const total = useMemo(() => selected.reduce((s, x) => s + (x.test.price || 0), 0), [selected]);

  const toggleTest = (t) => {
    if (selected.find(x => x.test.id === t.id)) {
      setSelected(selected.filter(x => x.test.id !== t.id));
    } else {
      setSelected([...selected, { test: t, values: {} }]);
    }
  };

  const setVal = (testId, idx, v) => {
    setSelected(selected.map(x => x.test.id === testId ? { ...x, values: { ...x.values, [idx]: v } } : x));
  };

  const buildResults = () => selected.map(x => ({
    test_id: x.test.id,
    test_code: x.test.code,
    test_name: x.test.name,
    category: x.test.category,
    parameters: x.test.parameters.map((p, i) => {
      const value = x.values[i] ?? "";
      const ref = patient?.gender === "Female" ? p.ref_female : p.ref_male;
      const flag = flagForValue(value, p.low, p.high);
      return { name: p.name, unit: p.unit, value: String(value), ref, flag, group: p.group || "" };
    })
  }));

  const save = async (print = false) => {
    if (!patient || selected.length === 0) return;
    setSaving(true);
    try {
      const payload = { patient_id: patient.id, results: buildResults(), total_amount: total, status: "completed", clinical_notes: notes };
      const { data } = await api.post("/reports", payload);
      setSavedReport(data);
      if (print) setShowPrint(true);
      else nav(`/reports`);
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Create Report</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">New Patient Report</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left - selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">Step 1 · Select Patient</div>
            <select
              data-testid="report-select-patient-dropdown"
              value={patientId} onChange={e=>setPatientId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-white border border-slate-300 focus:border-rose-500 outline-none"
            >
              <option value="">— Choose patient —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.mr_number} · {p.name} ({p.age}y, {p.gender})</option>)}
            </select>
            {patient && (
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div><b>{patient.name}</b> · {patient.age}y · {patient.gender}</div>
                <div className="text-slate-500">{patient.phone} · Ref: {patient.referring_physician || "—"}</div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">Step 2 · Select Tests</div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                data-testid="report-test-search"
                placeholder="Search tests..." value={q} onChange={e=>setQ(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 focus:border-rose-500 outline-none"
              />
            </div>
            <div className="mt-3 max-h-96 overflow-y-auto divide-y divide-slate-100">
              {filtered.map(t => {
                const checked = !!selected.find(x => x.test.id === t.id);
                return (
                  <label key={t.id} className={`flex items-center justify-between gap-3 py-2.5 cursor-pointer px-2 rounded ${checked ? "bg-rose-50" : "hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <input data-testid="report-test-checkbox" type="checkbox" checked={checked} onChange={()=>toggleTest(t)} className="h-4 w-4 accent-rose-700"/>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono-num">{t.code} · {t.category}</div>
                      </div>
                    </div>
                    <div className="font-mono-num text-sm font-bold text-slate-900">{formatPKR(t.price)}</div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right - results entry */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Step 3 · Enter Results</div>
              <div className="text-sm font-mono-num font-bold text-slate-900">{selected.length} test{selected.length !== 1 ? "s" : ""} · {formatPKR(total)}</div>
            </div>
            {selected.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Beaker size={32} className="mx-auto mb-2 opacity-50"/>
                <div className="text-sm">Select tests from the catalog to enter result values.</div>
              </div>
            )}
            <div className="space-y-5">
              {selected.map(x => (
                <div key={x.test.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-display font-bold text-slate-900">{x.test.name}</div>
                      <div className="text-xs text-slate-500">{x.test.category} · {x.test.specimen}</div>
                    </div>
                    <button onClick={()=>toggleTest(x.test)} className="text-slate-400 hover:text-rose-700"><Trash2 size={16}/></button>
                  </div>
                  <div className="space-y-2">
                    {x.test.parameters.map((p, i) => {
                      const value = x.values[i] ?? "";
                      const flag = flagForValue(value, p.low, p.high);
                      const ref = patient?.gender === "Female" ? p.ref_female : p.ref_male;
                      const prevGroup = i > 0 ? (x.test.parameters[i - 1].group || "") : "__start__";
                      const showGroup = p.group && p.group !== prevGroup;
                      return (
                        <React.Fragment key={i}>
                          {showGroup && (
                            <div className="col-span-12 mt-2 pt-2 border-t border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">{p.group}</div>
                          )}
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-12 sm:col-span-5 text-sm text-slate-700">{p.name}</div>
                            <div className="col-span-6 sm:col-span-3">
                              <input
                                data-testid="report-input-value"
                                value={value} onChange={e=>setVal(x.test.id, i, e.target.value)}
                                placeholder="Value"
                                className="w-full h-9 px-2 rounded border border-slate-300 font-mono-num focus:border-rose-500 outline-none text-sm"
                              />
                            </div>
                            <div className="col-span-3 sm:col-span-2 text-xs text-slate-500 font-mono-num">{p.unit}</div>
                            <div className="col-span-3 sm:col-span-2 text-right">
                              {flag && flag !== "N" && (
                                <span data-testid="report-flag-abnormal-badge" className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${flag === "H" ? "flag-H" : "flag-L"}`}>
                                  {flag}
                                </span>
                              )}
                              {flag === "N" && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold flag-N">N</span>}
                            </div>
                            <div className="col-span-12 text-[11px] text-slate-500 -mt-1">Ref ({patient?.gender || "M"}): <span className="font-mono-num">{ref}</span></div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="mt-4 space-y-3">
                <CommentSnippets
                  activeCategories={Array.from(new Set(selected.map(x => x.test.category).filter(Boolean)))}
                  activeFlags={selected.flatMap(x =>
                    x.test.parameters.map((p, i) => {
                      const v = x.values[i];
                      const f = flagForValue(v, p.low, p.high);
                      return (f === "H" || f === "L") ? { name: p.name, flag: f } : null;
                    }).filter(Boolean)
                  )}
                  onInsert={(txt) => setNotes(notes ? `${notes}\n${txt}` : txt)}
                />
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase">Clinical Notes</label>
                  <textarea
                    data-testid="report-clinical-notes"
                    value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                    className="mt-1 w-full px-3 py-2 rounded border border-slate-300 focus:border-rose-500 outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              data-testid="report-save-draft-button"
              disabled={!patient || selected.length === 0 || saving}
              onClick={()=>save(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"
            >
              <Save size={16}/> Save Report
            </button>
            <button
              data-testid="report-print-pdf-button"
              disabled={!patient || selected.length === 0 || saving}
              onClick={()=>save(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-sm disabled:opacity-50"
            >
              <Printer size={16}/> Save & Print
            </button>
          </div>
        </div>
      </div>

      {showPrint && savedReport && (
        <ReportPreview report={savedReport} onClose={()=>{ setShowPrint(false); nav("/reports"); }} />
      )}
    </div>
  );
}
