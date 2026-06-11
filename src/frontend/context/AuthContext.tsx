import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../services/api";
import * as authService from "../services/authService";
import type { AuthUser } from "../services/authService";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  jwt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    jwt: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * Ao montar o provider, tenta restaurar a sessão salva no AsyncStorage.
   */
  useEffect(() => {
    async function restoreSession() {
      try {
        const [jwt, userRaw] = await AsyncStorage.multiGet([
          STORAGE_KEYS.JWT,
          STORAGE_KEYS.USER,
        ]);

        const storedJwt = jwt[1];
        const storedUser = userRaw[1];

        if (storedJwt && storedUser) {
          const user: AuthUser = JSON.parse(storedUser);
          setState({
            user,
            jwt: storedJwt,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        // Se falhar em parsear, limpa tudo e continua sem sessão
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { jwt, userReturned } = await authService.login(email, password);
    setState({
      user: userReturned,
      jwt,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { jwt, userReturned } = await authService.register(
        name,
        email,
        password,
      );
      setState({
        user: userReturned,
        jwt,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setState({
      user: null,
      jwt: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
