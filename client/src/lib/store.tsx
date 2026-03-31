import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type KidStatus = "green" | "yellow" | "red";

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface KidEntry {
  id: string;
  kidName: string;
  hoursOfPlay: number;
  parentsCount: number;
  startTime: number; // timestamp
  childSocks: string;
  parentSocks?: string;
  customFields: CustomField[];
}

export interface StoreContextType {
  kids: KidEntry[];
  isAuthenticated: boolean;
  addKid: (kid: Omit<KidEntry, "id" | "startTime">) => void;
  removeKid: (id: string) => void;
  extendTime: (id: string, additionalHours: number) => void;
  login: () => void;
  logout: () => void;
  getKidStatus: (kid: KidEntry) => KidStatus;
  getRemainingMinutes: (kid: KidEntry) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Generate some mock historical data for the charts
export const MOCK_HISTORICAL_DATA = Array.from({ length: 14 }).map((_, i) => {
  const hour = i + 8; // 8 AM to 9 PM
  return {
    time: `${hour}:00`,
    kids: Math.floor(Math.random() * 20) + 5,
  };
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [kids, setKids] = useState<KidEntry[]>([
    // Add a couple of initial mock kids for demonstration
    {
      id: "1",
      kidName: "Leo",
      hoursOfPlay: 1,
      parentsCount: 1,
      startTime: Date.now() - 45 * 60 * 1000, // 45 mins ago
      childSocks: "C-123",
      parentSocks: "P-456",
      customFields: [{ id: "c1", label: "Notes", value: "Allergic to peanuts" }]
    },
    {
      id: "2",
      kidName: "Mia",
      hoursOfPlay: 2,
      parentsCount: 2,
      startTime: Date.now() - 1 * 60 * 60 * 1000 - 55 * 60 * 1000, // 1h 55m ago (almost 2 hours)
      childSocks: "C-456",
      customFields: []
    },
    {
      id: "3",
      kidName: "Noah",
      hoursOfPlay: 1,
      parentsCount: 1,
      startTime: Date.now() - 65 * 60 * 1000, // 65 mins ago (overtime)
      childSocks: "C-789",
      customFields: []
    }
  ]);

  // Force re-render every minute to update statuses
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const addKid = (kidData: Omit<KidEntry, "id" | "startTime">) => {
    const newKid: KidEntry = {
      ...kidData,
      id: Math.random().toString(36).substring(7),
      startTime: Date.now(),
    };
    setKids((prev) => [newKid, ...prev]);
  };

  const removeKid = (id: string) => {
    setKids((prev) => prev.filter((k) => k.id !== id));
  };

  const extendTime = (id: string, additionalHours: number) => {
    setKids((prev) =>
      prev.map((kid) =>
        kid.id === id
          ? { ...kid, hoursOfPlay: kid.hoursOfPlay + additionalHours }
          : kid
      )
    );
  };

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
        addKid,
        removeKid,
        extendTime,
        login,
        logout,
        getKidStatus,
        getRemainingMinutes
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
