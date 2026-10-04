import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { Logo } from "@/components/Logo";
import { Save, Upload, Image as ImageIcon, Trash2, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const { settings, update, reload, logoUrl } = useSettings();
  const [form, setForm] = useState(settings);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { setForm(settings); }, [settings]);

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true); setErr(""); setMsg("");
    try {
      await update(form);
      setMsg("Settings saved successfully.");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr("Logo must be under 2 MB"); return; }
    setUploading(true); setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/settings/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await reload();
      setMsg("Logo uploaded.");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); }
  };

  const clearLogo = async () => {
    await update({ logo_path: "" });
    setMsg("Logo removed.");
    setTimeout(() => setMsg(""), 2500);
  };

  const Field = ({ label, k, type = "text", placeholder = "" }) => (
    <div>
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
      <input
        data-testid={`settings-${k}`}
        type={type} value={form[k] || ""} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
      />
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Lab Branding</div>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Lab name, address, logo and letterhead colors used across the dashboard and printed reports.</p>
      </div>

      {msg && <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><CheckCircle2 size={16}/>{msg}</div>}
      {err && <div className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">Lab Logo</div>
          <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Lab Logo" className="max-h-28 max-w-full object-contain"/>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Logo size={56}/>
                <span className="text-xs">No custom logo</span>
              </div>
            )}
          </div>

          <label className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer transition">
            <Upload size={16}/> {uploading ? "Uploading..." : "Upload Logo (PNG/JPG, <2MB)"}
            <input
              data-testid="settings-upload-logo"
              type="file" accept="image/*" className="hidden"
              onChange={(e)=>uploadLogo(e.target.files?.[0])}
              disabled={uploading}
            />
          </label>
          {settings.logo_path && (
            <button type="button" onClick={clearLogo} className="mt-2 w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:border-rose-300 text-sm transition">
              <Trash2 size={14}/> Remove Logo
            </button>
          )}
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Your logo appears on the dashboard header, login screen and every printed patient report.
          </p>
        </div>

        {/* Details card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Lab Identity</div>
            <Field label="Lab Name" k="lab_name" placeholder="LabCare Clinical Laboratory"/>
            <Field label="Tagline" k="tagline" placeholder="Precision Diagnostics · ISO Accredited"/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" k="phone" placeholder="+92-300-0000000"/>
              <Field label="Email" k="email" type="email" placeholder="info@labcare.com"/>
            </div>
            <Field label="Address" k="address" placeholder="Chichawatni Road, Burewala"/>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-4">Letterhead Colors</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="Primary (headings/accents)" k="primary_color" form={form} setForm={setForm}/>
              <ColorField label="Accent (secondary)" k="accent_color" form={form} setForm={setForm}/>
            </div>
            <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-xs font-semibold text-slate-500 mb-2">Preview</div>
              <div className="flex items-center gap-3">
                {logoUrl ? <img src={logoUrl} alt="" className="h-12 w-12 object-contain"/> : <Logo size={48}/>}
                <div>
                  <div className="font-display font-black text-xl" style={{ color: form.primary_color }}>{form.lab_name}</div>
                  <div className="text-xs" style={{ color: form.accent_color }}>{form.tagline}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              data-testid="settings-save-button"
              type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow-sm transition disabled:opacity-60"
            >
              <Save size={16}/> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ColorField({ label, k, form, setForm }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="color" value={form[k] || "#000000"}
          onChange={(e)=>setForm({ ...form, [k]: e.target.value })}
          className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
        />
        <input
          data-testid={`settings-${k}`}
          type="text" value={form[k] || ""} onChange={(e)=>setForm({ ...form, [k]: e.target.value })}
          className="flex-1 h-10 px-3 rounded border border-slate-300 font-mono-num text-sm"
        />
      </div>
    </div>
  );
}
