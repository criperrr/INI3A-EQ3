import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  loginUser,
  registerUser,
  logoutUser,
  getStoredTokens,
  type AuthUser,
} from "../services/auth";
import { ApiError } from "../services/api";

interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore auth state from stored tokens on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const tokens = await getStoredTokens();

        if (tokens.accessToken) {
          // We have a token — try to decode the user from it.
          // For simplicity, we decode the JWT payload client-side.
          const payload = decodeJwtPayload(tokens.accessToken);

          if (payload && payload.id) {
            setUser({
              id: payload.id,
              name: payload.name,
              email: payload.email,
              roleId: payload.roleId,
            });
          }
        }
      } catch {
        // Tokens invalid or corrupted — start fresh
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerUser(name, email, password);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context || Object.keys(context).length === 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Decodes a JWT payload without verification (client-side only).
 * The actual verification happens server-side.
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1]!;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export { ApiError };
