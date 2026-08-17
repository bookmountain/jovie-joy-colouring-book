"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminGetContent } from "@/lib/adminApi";
import { SITE_MODULES_KEY, type SiteModules } from "@/lib/site-modules";

type AdminModulesContextValue = {
  modules: SiteModules;
  refresh: () => Promise<void>;
};

// The default keeps every admin section visible until the toggle block loads,
// which also lets components render outside the provider (tests).
const AdminModulesContext = createContext<AdminModulesContextValue>({
  modules: {},
  refresh: async () => {},
});

export function AdminModulesProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<SiteModules>({});

  const refresh = useCallback(async () => {
    try {
      const block = await adminGetContent(SITE_MODULES_KEY);
      setModules((block.data ?? {}) as SiteModules);
    } catch {
      setModules({});
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <AdminModulesContext.Provider value={{ modules, refresh }}>
      {children}
    </AdminModulesContext.Provider>
  );
}

export function useAdminModules(): AdminModulesContextValue {
  return useContext(AdminModulesContext);
}
