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
  fetchUserProfile,
  type AuthUser,
  type UserProfileData,
} from "../services/auth";
import { ApiError } from "../services/api";

interface AuthContextData {
  user: AuthUser | null;
  profile: UserProfileData | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsTestUser: (role?: "user" | "admin") => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfileData | null>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const tokens = await getStoredTokens();
      if (!tokens.accessToken) {
        return null;
      }
      const fullProfile = await fetchUserProfile();
      if (fullProfile) {
        setProfile(fullProfile);
        setUser((prev) => ({
          ...prev,
          id: fullProfile.id,
          name: fullProfile.name,
          email: fullProfile.email,
          roleId: fullProfile.roleId,
          roleName: fullProfile.roleName,
          authority: fullProfile.authority,
          isAdmin: fullProfile.isAdmin,
          points: fullProfile.points,
          level: fullProfile.level,
          currentXp: fullProfile.currentXp,
          maxXp: fullProfile.maxXp,
          levelTitle: fullProfile.levelTitle,
        }));
        return fullProfile;
      }
    } catch (e) {
      console.error("[AuthContext] Error refreshing profile:", e);
    }
    return null;
  }, []);

  // Try to restore auth state from stored tokens on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const tokens = await getStoredTokens();

        if (tokens.accessToken) {
          const payload = decodeJwtPayload(tokens.accessToken);

          if (payload && payload.id) {
            setUser({
              id: payload.id,
              name: payload.name,
              email: payload.email,
              roleId: payload.roleId,
              isAdmin: payload.roleId === 5,
            });

            // Fetch complete profile asynchronously in background
            fetchUserProfile().then((p) => {
              if (p) {
                setProfile(p);
                setUser((prev) => ({
                  ...prev,
                  id: p.id,
                  name: p.name,
                  email: p.email,
                  roleId: p.roleId,
                  roleName: p.roleName,
                  authority: p.authority,
                  isAdmin: p.isAdmin,
                  points: p.points,
                  level: p.level,
                  currentXp: p.currentXp,
                  maxXp: p.maxXp,
                  levelTitle: p.levelTitle,
                }));
              }
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
    const p = await fetchUserProfile();
    if (p) {
      setProfile(p);
      setUser(p);
    }
  }, []);

  const loginAsTestUser = useCallback(
    async (type: "user" | "admin" = "user") => {
      const email = type === "admin" ? "admin@admin.org" : "usuario@presco.com";
      const pass = type === "admin" ? "admin" : "user123";
      await login(email, pass);
    },
    [login],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerUser(name, email, password);
      setUser(result.user);
      const p = await fetchUserProfile();
      if (p) {
        setProfile(p);
        setUser(p);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
  }, []);

  const isAdmin = !!(
    user?.roleId === 5 ||
    user?.isAdmin === true ||
    profile?.isAdmin === true ||
    (profile?.authority !== undefined && profile.authority >= 10)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsTestUser,
        register,
        logout,
        refreshProfile,
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
