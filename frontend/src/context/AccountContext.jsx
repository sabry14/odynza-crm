import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentUser } from "../services/api";
import { getStoredToken } from "../utils/auth";
import { hasPermission, canManageUsers } from "../utils/permissions";

export const AccountContext = createContext(null);
export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refreshAccount = useCallback(async () => {
    const current = ++generation.current;
    try {
      const data = await getCurrentUser(getStoredToken());
      if (current !== generation.current) return;
      setUser(data.user); setError("");
    } catch (err) {
      if (current !== generation.current) return;
      // Fail closed: no cached permissions are used when verification fails.
      setUser(null); setError(err.message || "Unable to verify your account");
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    refreshAccount();
    const timer = setInterval(refreshAccount, 60000);
    window.addEventListener("focus", refreshAccount);
    window.addEventListener("odynza:account-refresh", refreshAccount);
    return () => {
      generation.current += 1; clearInterval(timer);
      window.removeEventListener("focus", refreshAccount);
      window.removeEventListener("odynza:account-refresh", refreshAccount);
    };
  }, [refreshAccount]);
  return <AccountContext.Provider value={{ user, loading, error, refreshAccount, can: (permission) => hasPermission(user, permission), isUserAdmin: canManageUsers(user) }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("AccountProvider is required");
  return context;
}
