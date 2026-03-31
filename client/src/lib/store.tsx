import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

export type KidStatus = "green" | "yellow" | "red";

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface KidEntry {
  id: string;
  sessionId: number;
  kidName: string;
  hoursOfPlay: number;
  parentsCount: number;
  startTime: number;
  childSocks: string;
  parentSocks?: string;
  customFields: CustomField[];
}

export interface StoreContextType {
  kids: KidEntry[];
  isAuthenticated: boolean;
  isLoading: boolean;
  addKid: (kid: Omit<KidEntry, "id" | "startTime" | "sessionId">) => Promise<void>;
  removeKid: (id: string) => Promise<void>;
  extendTime: (id: string, additionalHours: number) => void;
  login: () => void;
  logout: () => void;
  getKidStatus: (kid: KidEntry) => KidStatus;
  getRemainingMinutes: (kid: KidEntry) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const todayDate = () => new Date().toISOString().split("T")[0];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [kids, setKids] = useState<KidEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTodaySessions() {
      try {
        const res = await fetch(`/api/sessions?date=${todayDate()}`);
        if (!res.ok) throw new Error("Failed to load sessions");
        const sessions: any[] = await res.json();
        const active = sessions.filter(s => !s.outTime);
        const mapped: KidEntry[] = active.map(s => ({
          id: String(s.id),
          sessionId: s.id,
          kidName: s.kidName,
          hoursOfPlay: s.hoursOfPlay,
          parentsCount: s.parentsCount,
          startTime: new Date(s.inTime).getTime(),
          childSocks: s.childSocks,
          parentSocks: s.parentSocks ?? undefined,
          customFields: Array.isArray(s.customFields) ? s.customFields : [],
        }));
        setKids(mapped);
      } catch (e) {
        console.error("Failed to load sessions:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadTodaySessions();
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const addKid = useCallback(async (kidData: Omit<KidEntry, "id" | "startTime" | "sessionId">) => {
    const payload = {
      kidName: kidData.kidName,
      hoursOfPlay: kidData.hoursOfPlay,
      parentsCount: kidData.parentsCount,
      childSocks: kidData.childSocks,
      parentSocks: kidData.parentSocks,
      customFields: kidData.customFields,
      date: todayDate(),
    };
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create session");
    const session = await res.json();
    const newKid: KidEntry = {
      id: String(session.id),
      sessionId: session.id,
      kidName: session.kidName,
      hoursOfPlay: session.hoursOfPlay,
      parentsCount: session.parentsCount,
      startTime: new Date(session.inTime).getTime(),
      childSocks: session.childSocks,
      parentSocks: session.parentSocks ?? undefined,
      customFields: Array.isArray(session.customFields) ? session.customFields : [],
    };
    setKids((prev) => [newKid, ...prev]);
  }, []);

  const removeKid = useCallback(async (id: string) => {
    const kid = kids.find(k => k.id === id);
    if (!kid) return;
    try {
      await fetch(`/api/sessions/${kid.sessionId}/end`, { method: "PATCH" });
    } catch (e) {
      console.error("Failed to end session:", e);
    }
    setKids((prev) => prev.filter((k) => k.id !== id));
  }, [kids]);

  const extendTime = useCallback((id: string, additionalHours: number) => {
    setKids((prev) =>
      prev.map((kid) =>
        kid.id === id
          ? { ...kid, hoursOfPlay: kid.hoursOfPlay + additionalHours }
          : kid
      )
    );
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  const getRemainingMinutes = (kid: KidEntry) => {
    const playTimeMs = kid.hoursOfPlay * 60 * 60 * 1000;
    const endTime = kid.startTime + playTimeMs;
    const now = Date.now();
    return Math.floor((endTime - now) / (1000 * 60));
  };

  const getKidStatus = (kid: KidEntry): KidStatus => {
    const remainingMins = getRemainingMinutes(kid);
    if (remainingMins < 0) return "red";
    if (remainingMins <= 10) return "yellow";
    return "green";
  };

  return (
    <StoreContext.Provider
      value={{
        kids,
        isAuthenticated,
        isLoading,
        addKid,
        removeKid,
        extendTime,
        login,
        logout,
        getKidStatus,
        getRemainingMinutes,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
