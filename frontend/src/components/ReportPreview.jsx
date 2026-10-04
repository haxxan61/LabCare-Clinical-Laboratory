import React from "react";
import { formatPKR } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useSettings } from "@/context/SettingsContext";
import { X, Printer } from "lucide-react";

export default function ReportPreview({ report, onClose }) {
  const p = report.patient_snapshot || {};
  const date = new Date(report.created_at);
  const { settings, logoUrl } = useSettings();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto">
      <div className="min-h-screen py-6 px-4 flex flex-col items-center">
        <div className="w-full max-w-4xl bg-white rounded-t-xl no-print">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="font-display font-bold">Report Preview · {report.report_no}</div>
            <div className="flex gap-2">
              <button onClick={()=>window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold"><Printer size={16}/>Print / Save PDF</button>
              <button data-testid="report-modal-close-button" onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X size={18}/></button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl bg-white shadow-2xl print-area">
          <div className="p-10">
            {/* Header */}
            <div className="flex items-start justify-between pb-5" style={{ borderBottom: `4px solid ${settings.primary_color || "#BE123C"}` }}>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Lab logo" crossOrigin="anonymous" className="h-16 w-16 object-contain"/>
                ) : (
                  <Logo size={64} />
                )}
                <div>
                  <h1 className="font-display text-3xl font-black" style={{ color: settings.primary_color || "#0F172A" }}>{settings.lab_name || "LabCare Clinical Laboratory"}</h1>
                  <div className="text-xs text-slate-600 mt-1">{settings.tagline}</div>
                  <div className="text-xs text-slate-500">{settings.address}{settings.phone ? ` · ${settings.phone}` : ""}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: settings.primary_color || "#BE123C" }}>Pathology Report</div>
                <div className="font-mono-num text-sm font-bold mt-1">{report.report_no}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{date.toLocaleDateString("en-PK")} · {date.toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>

            {/* Patient details */}
            <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-sm">
              <div className="space-y-1">
                <div><span className="text-slate-500 w-28 inline-block">Patient Name:</span> <b>{p.name}</b></div>
                <div><span className="text-slate-500 w-28 inline-block">MR Number:</span> <span className="font-mono-num">{p.mr_number}</span></div>
                <div><span className="text-slate-500 w-28 inline-block">Age / Gender:</span> {p.age}y · {p.gender}</div>
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500 w-32 inline-block">Referring Dr:</span> {p.referring_physician || "—"}</div>
                <div><span className="text-slate-500 w-32 inline-block">Phone:</span> {p.phone || "—"}</div>
                <div><span className="text-slate-500 w-32 inline-block">Collection Date:</span> {date.toLocaleDateString("en-PK")}</div>
              </div>
            </div>

            {/* Results */}
            {report.results.map((r, idx) => (
              <div key={idx} className="mt-5">
                <h3 className="font-display font-bold text-base uppercase tracking-wide border-b-2 pb-1" style={{ color: settings.primary_color || "#BE123C", borderColor: (settings.primary_color || "#BE123C") + "33" }}>
                  {r.test_name}
                </h3>
                <table className="w-full mt-2 text-sm print-table">
                  <thead>
                    <tr className="text-left text-xs text-slate-600 uppercase tracking-wider border-b border-slate-300">
                      <th className="py-2 pr-2 w-2/5">Parameter</th>
                      <th className="py-2 pr-2">Result</th>
                      <th className="py-2 pr-2">Unit</th>
                      <th className="py-2 pr-2">Reference Range</th>
                      <th className="py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.parameters.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 pr-2 text-slate-800">{p.name}</td>
                        <td className={`py-1.5 pr-2 font-mono-num font-bold ${p.flag==="H"||p.flag==="L"?"text-rose-700":"text-slate-900"}`}>{p.value || "—"}</td>
                        <td className="py-1.5 pr-2 text-slate-600 font-mono-num text-xs">{p.unit}</td>
                        <td className="py-1.5 pr-2 text-slate-600 font-mono-num text-xs">{p.ref}</td>
                        <td className="py-1.5">
                          {p.flag && p.flag !== "N" && p.flag !== "" && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${p.flag==="H"?"flag-H":"flag-L"}`}>{p.flag}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Notes */}
            {report.clinical_notes && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Clinical Notes</div>
                <div className="text-sm text-slate-700 mt-1">{report.clinical_notes}</div>
              </div>
            )}

            {/* Footer / signature */}
            <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between">
              <div className="text-xs text-slate-500 max-w-sm">
                <div className="font-semibold text-slate-700">Important</div>
                This report is for medical reference only. Please correlate with clinical findings.
                Reference ranges may vary by age, gender, and physiological state.
              </div>
              <div className="text-right">
                <div className="h-14 border-b-2 border-slate-400 w-56"></div>
                <div className="text-xs font-semibold mt-1">{report.pathologist || "Chief Pathologist"}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Digitally Verified</div>
              </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-3">
              Total Amount: <b className="text-slate-700 font-mono-num">{formatPKR(report.total_amount)}</b> · Thank you for choosing {settings.lab_name || "LabCare"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
