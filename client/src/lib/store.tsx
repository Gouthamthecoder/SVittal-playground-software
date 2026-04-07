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

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "staff";
}

export interface ShopInfo {
  id: number;
  name: string;
  code?: string | null;
  role?: string;
}

export interface KidUpdate {
  kidName?: string;
  hoursOfPlay?: number;
  parentsCount?: number;
  childSocks?: string;
  parentSocks?: string | null;
  customFields?: CustomField[];
}

export interface StoreContextType {
  kids: KidEntry[];
  user: AuthUser | null;
  currentShop: ShopInfo | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  authLoading: boolean;
  addKid: (kid: Omit<KidEntry, "id" | "startTime" | "sessionId">) => Promise<void>;
  updateKid: (id: string, updates: KidUpdate) => Promise<void>;
  removeKid: (id: string) => Promise<void>;
  extendTime: (id: string, additionalHours: number) => void;
  prelogin: (username: string, password: string) => Promise<ShopInfo[]>;
  login: (username: string, password: string, shopId: number) => Promise<void>;
  logout: () => Promise<void>;
  switchShop: (shop: ShopInfo) => Promise<void>;
  getKidStatus: (kid: KidEntry) => KidStatus;
  getRemainingMinutes: (kid: KidEntry) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const todayDate = () => new Date().toISOString().split("T")[0];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentShop, setCurrentShop] = useState<ShopInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [kids, setKids] = useState<KidEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if already logged in via session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser({ id: data.id, username: data.username, role: data.role });
          if (data.shopId) {
            setCurrentShop({ id: data.shopId, name: data.shopName });
          }
        }
      } catch {
        // not logged in
      } finally {
        setAuthLoading(false);
      }
    }
    checkSession();
  }, []);

  // Load today's active sessions when authenticated
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    async function loadTodaySessions() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sessions?date=${todayDate()}`);
        if (!res.ok) throw new Error("Failed to load sessions");
        const sessions: any[] = await res.json();
        const active = sessions.filter((s: any) => !s.outTime);
        const mapped: KidEntry[] = active.map((s: any) => ({
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
  }, [user]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Step 1: validate credentials, return list of shops
  const prelogin = useCallback(async (username: string, password: string): Promise<ShopInfo[]> => {
    const res = await fetch("/api/auth/prelogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Invalid username or password");
    }
    const data = await res.json();
    return data.shops as ShopInfo[];
  }, []);

  // Step 2: full login with selected shop
  const login = useCallback(async (username: string, password: string, shopId: number) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, shopId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    setUser({ id: data.id, username: data.username, role: data.role });
    setCurrentShop({ id: data.shopId, name: data.shopName });
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCurrentShop(null);
    setKids([]);
  }, []);

  const switchShop = useCallback(async (shop: ShopInfo) => {
    const res = await fetch("/api/auth/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to switch shop");
    }
    setCurrentShop(shop);
    setKids([]);
    // reload sessions for new shop
    setIsLoading(true);
    try {
      const res2 = await fetch(`/api/sessions?date=${todayDate()}`);
      if (!res2.ok) throw new Error("Failed to load sessions");
      const sessions: any[] = await res2.json();
      const active = sessions.filter((s: any) => !s.outTime);
      const mapped: KidEntry[] = active.map((s: any) => ({
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

  const updateKid = useCallback(async (id: string, updates: KidUpdate) => {
    const kid = kids.find(k => k.id === id);
    if (!kid) return;
    const res = await fetch(`/api/sessions/${kid.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update session");
    const session = await res.json();
    setKids(prev => prev.map(k => k.id === id ? {
      ...k,
      kidName: session.kidName,
      hoursOfPlay: session.hoursOfPlay,
      parentsCount: session.parentsCount,
      childSocks: session.childSocks,
      parentSocks: session.parentSocks ?? undefined,
      customFields: Array.isArray(session.customFields) ? session.customFields : [],
    } : k));
  }, [kids]);

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
        user,
        currentShop,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isLoading,
        authLoading,
        addKid,
        updateKid,
        removeKid,
        extendTime,
        prelogin,
        login,
        logout,
        switchShop,
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
