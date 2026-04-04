import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "@/lib/api";

interface CrisisContextType {
  isCrisis: boolean;
  refreshKey: number;
  toggleCrisis: (enable: boolean, profileId: string) => Promise<void>;
}

const CrisisContext = createContext<CrisisContextType>({
  isCrisis: false,
  refreshKey: 0,
  toggleCrisis: async () => {},
});

export function CrisisProvider({ children }: { children: ReactNode }) {
  const [isCrisis, setIsCrisis] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function toggleCrisis(enable: boolean, profileId: string) {
    try {
      await api.post(
        `/api/debug/crisis-toggle?enable=${enable}&profile_id=${profileId}`,
        {}
      );
      setIsCrisis(enable);
      setRefreshKey((prev) => prev + 1);
    } catch {
      // silent — toggle still flips locally so UI responds
      setIsCrisis(enable);
      setRefreshKey((prev) => prev + 1);
    }
  }

  return (
    <CrisisContext.Provider value={{ isCrisis, refreshKey, toggleCrisis }}>
      {children}
    </CrisisContext.Provider>
  );
}

export const useCrisis = () => useContext(CrisisContext);
