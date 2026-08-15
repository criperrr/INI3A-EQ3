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
 * Handles UTF-8 and base64url padding safely across iOS, Android, and Web.
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let bytes = "";
    for (let i = 0; i < base64.length; i += 4) {
      const enc1 = chars.indexOf(base64.charAt(i));
      const enc2 = chars.indexOf(base64.charAt(i + 1));
      const enc3 = chars.indexOf(base64.charAt(i + 2));
      const enc4 = chars.indexOf(base64.charAt(i + 3));

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      bytes += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) bytes += String.fromCharCode(chr2);
      if (enc4 !== 64 && enc4 !== -1) bytes += String.fromCharCode(chr3);
    }

    const decodedUtf8 = decodeURIComponent(
      bytes
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(decodedUtf8);
  } catch {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      let base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) base64 += "=";
      if (typeof atob === "function") {
        return JSON.parse(atob(base64));
      }
      return null;
    } catch {
      return null;
    }
  }
}

export { ApiError };
