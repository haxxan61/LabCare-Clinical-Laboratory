import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, API } from "@/lib/api";

const SettingsCtx = createContext(null);

const DEFAULTS = {
  lab_name: "LabCare Clinical Laboratory",
  tagline: "Precision Diagnostics · ISO Accredited",
  address: "",
  phone: "",
  email: "",
  primary_color: "#BE123C",
  accent_color: "#0D9488",
  logo_path: "",
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings({ ...DEFAULTS, ...data });
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (patch) => {
    const { data } = await api.put("/settings", patch);
    setSettings({ ...DEFAULTS, ...data });
    return data;
  };

  // Append a cache-buster whenever logo changes so <img> refreshes
  const logoUrl = settings.logo_path ? `${API}/settings/logo?v=${encodeURIComponent(settings.logo_path)}` : "";

  return (
    <SettingsCtx.Provider value={{ settings, update, reload: load, logoUrl }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export const useSettings = () => useContext(SettingsCtx);
