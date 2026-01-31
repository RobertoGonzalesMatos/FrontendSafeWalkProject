import React, { createContext, useContext, useMemo, useState } from "react";
import type { User } from "../api/types";
import { setAuthToken } from "../api/client";

type ActiveRequestSummary = {
  requestId: string;
  status: "MATCHING" | "ASSIGNED";
  etaSeconds?: number | null;
  studentCode?: string;
  safewalkerCode?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  signInWithGoogle: () => Promise<void>;
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

  /**
   * Helper to fetch current session & user attributes, then update state.
   * Returns true if successfully authenticated, false otherwise.
   */
  async function syncUserFromSession(): Promise<boolean> {
    try {
      const { getCurrentUser, fetchAuthSession, fetchUserAttributes } = await import("aws-amplify/auth");

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (currentUser && idToken) {
        let displayName = "User";
        try {
          const attributes = await fetchUserAttributes();
          // Try common name fields, fallback to email username, then "User"
          displayName = attributes.name || attributes.given_name || attributes.email?.split('@')[0] || "User";
        } catch (err) {
          console.log("[AuthContext] Failed to fetch attributes:", err);
        }

        const userData: User = {
          id: currentUser.userId,
          email: currentUser.signInDetails?.loginId || "unknown",
          role: "STUDENT",
          name: displayName,
        };
        setToken(idToken);
        setUser(userData);
        setAuthToken(idToken);
        return true;
      }
    } catch (e) {
      console.log("[AuthContext] No active session or sync failed");
    }
    return false;
  }

  async function signInWithGoogle() {
    try {
      const { signInWithRedirect, signOut } = await import("aws-amplify/auth");
      try {
        await signInWithRedirect({ provider: "Google" });
      } catch (err: any) {
        // Handle "Already signed in" by syncing session
        if (
          err.name === 'UserAlreadyAuthenticatedException' ||
          err.message?.includes('already signed in')
        ) {
          console.log("[AuthContext] User already signed in. Syncing session...");
          const success = await syncUserFromSession();
          if (!success) {
            // State is messed up (Amplify says yes, but we can't get session). Force signout and retry.
            console.log("[AuthContext] Stale session detected. Forcing signout -> retry.");
            try { await signOut({ global: false }); } catch (_) { }
            await signInWithRedirect({ provider: "Google" });
          }
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error("[AuthContext] Google Login failed", e);
      throw e;
    }
  }

  // Check for existing session on mount
  React.useEffect(() => {
    let hubRemove: (() => void) | undefined;
    let isMounted = true;

    const listener = (data: any) => {
      if (data.payload.event === 'signIn' || data.payload.event === 'signedIn') {
        console.log("[AuthContext] Hub detected signIn/signedIn");
        syncUserFromSession();
      }
      if (data.payload.event === 'signOut') {
        // Optional: clear state on remote signout if desired
        // setToken(null); setUser(null); ...
      }
    };

    async function setup() {
      await syncUserFromSession();
      if (!isMounted) return;

      const { Hub } = await import("aws-amplify/utils");
      if (!isMounted) return;

      console.log("[AuthContext] Setting up Hub listener");
      hubRemove = Hub.listen('auth', listener);
    }

    setup();

    return () => {
      isMounted = false;
      hubRemove?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: (t, u) => {
        setToken(t);
        setUser(u);
        setAuthToken(t);
      },
      signInWithGoogle,
      logout: () => {
        // Just clear local state
        // DO NOT call Amplify signOut - it triggers OAuth redirects
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
