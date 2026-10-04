import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Search, X, UserPlus, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function Patients() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", age:"", gender:"Male", phone:"", address:"", referring_physician:"" });
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await api.get("/patients");
    setList(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      await api.post("/patients", { ...form, age: parseInt(form.age) || 0 });
      setOpen(false);
      setForm({ name:"", age:"", gender:"Male", phone:"", address:"", referring_physician:"" });
      load();
    } catch (e) { setErr(e?.response?.data?.detail || "Failed"); }
  };

  const filtered = list.filter(p =>
    [p.name, p.mr_number, p.phone, p.referring_physician].some(f => (f||"").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Patient Records</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">Patients</h1>
          <p className="text-slate-500 text-sm mt-1">{list.length} total registered</p>
        </div>
        <button data-testid="patient-add-button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow-sm transition">
          <UserPlus size={18}/> Add Patient
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="patient-search-input"
          placeholder="Search by name, MR number, phone..."
          value={q} onChange={e=>setQ(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">MR Number</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Age/Gender</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Referring Physician</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono-num text-slate-700">{p.mr_number}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}
                    {p.address && <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10}/>{p.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.age}y · {p.gender}</td>
                  <td className="px-4 py-3 text-slate-700">{p.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{p.referring_physician}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/patients/${p.id}`} className="text-rose-700 hover:underline font-semibold text-xs">View History →</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">No patients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="font-display font-bold text-xl">Add New Patient</h3>
              <button type="button" onClick={()=>setOpen(false)} className="p-1"><X size={20}/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Full Name</label>
                <input data-testid="patient-form-name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Age</label>
                <input data-testid="patient-form-age" required type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase">Gender</label>
                <select data-testid="patient-form-gender" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Phone</label>
                <input data-testid="patient-form-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Referring Physician</label>
                <input value={form.referring_physician} onChange={e=>setForm({...form,referring_physician:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Address</label>
                <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"/>
              </div>
              {err && <div className="col-span-2 text-sm text-rose-700">{err}</div>}
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-sm">Cancel</button>
              <button data-testid="patient-form-submit" type="submit" className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-sm">Save Patient</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
