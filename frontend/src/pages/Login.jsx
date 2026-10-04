import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { useSettings } from "@/context/SettingsContext";
import { Loader2, LockKeyhole } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { settings, logoUrl } = useSettings();
  const [email, setEmail] = useState("admin@labcare.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try { await login(email, password); }
    catch (e) { setErr(e?.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="auth-panel text-white p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-11 w-11 object-contain bg-white/5 p-1 rounded"/>
          ) : (
            <Logo size={44} />
          )}
          <div>
            <div className="font-display font-bold text-xl">{(settings.lab_name || "LabCare").split(" ")[0]}</div>
            <div className="text-xs text-slate-300 uppercase tracking-widest">Clinical Laboratory</div>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-4xl lg:text-5xl font-black leading-tight">
            Precision diagnostics,<br />
            <span className="text-rose-400">pathologist-grade</span> reports.
          </h1>
          <p className="mt-5 text-slate-300 max-w-md leading-relaxed">
            Patient records, 50+ pre-loaded test parameters with reference ranges, auto-flagging of abnormal values, and print-ready A4 PDF reports — built for your lab.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[{k:"50+",v:"Lab tests"},{k:"A4",v:"Print-ready"},{k:"PWA",v:"Install anywhere"}].map(s=>(
              <div key={s.k} className="rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur">
                <div className="font-display text-2xl font-bold text-rose-400">{s.k}</div>
                <div className="text-xs text-slate-300">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400">© {new Date().getFullYear()} LabCare Clinical Laboratory</div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16 brand-grid">
        <form onSubmit={submit} className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 lg:p-10">
          <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-[0.2em]">
            <LockKeyhole size={14} /> Staff Access
          </div>
          <h2 className="font-display text-3xl font-black mt-2">Sign in to continue</h2>
          <p className="text-slate-500 text-sm mt-2">Enter your lab credentials to manage patients and reports.</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</label>
              <input
                data-testid="staff-login-email"
                type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
                className="mt-1 w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
              <input
                data-testid="staff-login-password"
                type="password" required value={password} onChange={(e)=>setPassword(e.target.value)}
                className="mt-1 w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>
            {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{err}</div>}
            <button
              data-testid="staff-login-button"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Demo: <b>admin@labcare.com</b> / <b>admin123</b>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
