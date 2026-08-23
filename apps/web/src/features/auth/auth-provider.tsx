"use client";

import type { UserContract } from "@shopmind/contracts";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  loginUser,
  logoutUser,
  refreshSession,
  setAccessToken,
} from "@/lib/api/client";

interface AuthContextValue {
  readonly user: UserContract | null;
  readonly ready: boolean;
  readonly login: (input: {
    readonly email: string;
    readonly password: string;
  }) => Promise<void>;
  readonly logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const [user, setUser] = useState<UserContract | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void refreshSession()
      .then((session) => setUser(session.user))
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  async function login(input: {
    readonly email: string;
    readonly password: string;
  }): Promise<void> {
    const session = await loginUser(input);
    setUser(session.user);
    setReady(true);
  }

  async function logout(): Promise<void> {
    try {
      await logoutUser();
    } finally {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    }
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
