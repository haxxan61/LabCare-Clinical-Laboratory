import React, { useEffect, useState } from "react";
import { api, formatPKR } from "@/lib/api";
import { Search, FlaskConical, Download, Loader2 } from "lucide-react";

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const load = async () => {
    const { data } = await api.get("/tests");
    setTests(data);
  };
  useEffect(() => { load(); }, []);

  const cats = ["All", ...Array.from(new Set(tests.map(t => t.category))).sort()];
  const filtered = tests.filter(t =>
    (cat === "All" || t.category === cat) &&
    (q === "" || t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase()))
  );

  const savePrice = async (t, newPrice) => {
    await api.put(`/tests/${t.id}`, { ...t, price: parseFloat(newPrice) || 0 });
    load();
    setEditing(null);
  };

  const importFull = async () => {
    if (!confirm("Import the full test catalog (700+ tests) from the Umar PDF? Existing tests will be preserved.")) return;
    setImporting(true); setImportMsg("");
    try {
      const { data } = await api.post("/tests/import-full");
      setImportMsg(`Added ${data.added} new tests. Total now: ${data.total}.`);
      await load();
      setTimeout(() => setImportMsg(""), 5000);
    } catch (e) {
      setImportMsg("Import failed. Please try again.");
    } finally { setImporting(false); }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Test Catalog</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">Available Tests</h1>
          <p className="text-slate-500 text-sm mt-1">{tests.length} tests · click a price to edit</p>
        </div>
        <button
          data-testid="catalog-import-full-button"
          onClick={importFull} disabled={importing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition disabled:opacity-60"
        >
          {importing ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
          Import Full Catalog (700+)
        </button>
      </div>
      {importMsg && <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">{importMsg}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="catalog-search-input"
            placeholder="Search tests by name or code..."
            value={q} onChange={e=>setQ(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
          />
        </div>
        <select
          data-testid="catalog-category-filter"
          value={cat} onChange={e=>setCat(e.target.value)}
          className="h-11 px-3 rounded-lg bg-white border border-slate-200 min-w-[180px]"
        >
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-rose-200 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <FlaskConical size={16} />
                </div>
                <div>
                  <div className="font-mono-num text-[11px] text-slate-500 font-semibold">{t.code}</div>
                  <div className="text-[10px] uppercase tracking-wider text-teal-700 font-bold">{t.category}</div>
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mt-3 leading-snug">{t.name}</h3>
            <div className="text-xs text-slate-500 mt-1">{t.specimen} · {t.tat_hours}h TAT · {t.parameters.length} parameter{t.parameters.length !== 1 ? "s" : ""}</div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
              {editing === t.id ? (
                <input
                  autoFocus type="number" defaultValue={t.price}
                  onBlur={(e)=>savePrice(t, e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==="Enter") savePrice(t, e.target.value); if(e.key==="Escape") setEditing(null); }}
                  className="w-28 h-8 px-2 rounded border border-rose-300 font-mono-num font-bold"
                />
              ) : (
                <button onClick={()=>setEditing(t.id)} className="font-display font-bold text-lg text-slate-900 hover:text-rose-700 transition">
                  {formatPKR(t.price)}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
