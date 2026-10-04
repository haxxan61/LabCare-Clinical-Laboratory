import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard, Users, FlaskConical, FilePlus2, FileText,
  LineChart, LogOut, Menu, Settings as SettingsIcon
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard-tab", end: true },
  { to: "/patients", icon: Users, label: "Patients", testid: "nav-patients-tab" },
  { to: "/catalog", icon: FlaskConical, label: "Test Catalog", testid: "nav-catalog-tab" },
  { to: "/reports/new", icon: FilePlus2, label: "New Report", testid: "nav-new-report-tab" },
  { to: "/reports", icon: FileText, label: "Reports", testid: "nav-reports-tab" },
  { to: "/analytics", icon: LineChart, label: "Analytics", testid: "nav-analytics-tab" },
  { to: "/settings", icon: SettingsIcon, label: "Settings", testid: "nav-settings-tab" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { settings, logoUrl } = useSettings();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); nav("/login"); };

  const BrandBlock = () => (
    <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-800">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-9 w-9 object-contain rounded bg-white/5 p-1"/>
      ) : (
        <Logo size={36} />
      )}
      <div>
        <div className="font-display font-bold text-white text-base leading-none">{(settings.lab_name || "LabCare").split(" ")[0]}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Clinical Lab</div>
      </div>
    </div>
  );

  const SidebarInner = () => (
    <div className="h-full flex flex-col">
      <BrandBlock />
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV.map((n) => (
          <NavLink
            key={n.to} to={n.to} end={n.end}
            data-testid={n.testid}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-rose-700 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <n.icon size={18} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="text-xs text-slate-400">Signed in as</div>
        <div className="text-sm font-semibold text-white">{user?.name}</div>
        <div className="text-xs text-slate-400 mb-3">{user?.email}</div>
        <button
          data-testid="logout-button"
          onClick={doLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 hover:bg-rose-700 text-slate-200 hover:text-white transition"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-shrink-0 sticky top-0 h-screen">
        <SidebarInner />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white">
            <SidebarInner />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 h-14 flex items-center justify-between">
          <button data-testid="mobile-menu-toggle" onClick={()=>setOpen(true)} className="p-2 -ml-2">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            {logoUrl ? <img src={logoUrl} alt="" className="h-7 w-7 object-contain"/> : <Logo size={28}/>}
            <span className="font-display font-bold">{(settings.lab_name || "LabCare").split(" ")[0]}</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
