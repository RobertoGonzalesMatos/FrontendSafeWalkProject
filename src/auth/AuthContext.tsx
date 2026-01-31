import React, { createContext, useContext, useMemo, useState } from "react";
import type { User } from "../api/types";
import { setAuthToken } from "../api/client";

type ActiveRequestSummary = {
  requestId: string;
  status: "MATCHING" | "ASSIGNED";
  etaSeconds?: number | null;
  studentCode?: string;
  volunteerCode?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;

  activeRequest: ActiveRequestSummary | null;
  setActiveRequest: (r: ActiveRequestSummary | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] =
    useState<ActiveRequestSummary | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: (t, u) => {
        setToken(t);
        setUser(u);
        setAuthToken(t);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        setActiveRequest(null);
        setAuthToken(null);
      },

      activeRequest,
      setActiveRequest,
    }),
    [user, token, activeRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
