import { useState, useEffect, useCallback } from "react";
import { getMe, loginAccount, logoutAccount, registerAccount } from "../utils/api";

export function useAuthSession() {
  const [username, setUsername] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    getMe()
      .then(res => {
        if (!mounted) return;
        if (res.authenticated && res.username) {
          setUsername(res.username);
        }
        setApiConnected(true);
      })
      .catch(() => {
        if (!mounted) return;
        setApiConnected(false);
      })
      .finally(() => {
        if (mounted) setIsBootstrapped(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = useCallback(async (u: string, p: string) => {
    setAuthBusy(true);
    try {
      const res = await loginAccount(u, p);
      if (res.success && res.username) {
        setUsername(res.username);
        return { ok: true };
      }
      return { ok: false, message: "Login failed" };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Network error during login" };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleRegister = useCallback(async (u: string, p: string) => {
    setAuthBusy(true);
    try {
      const reg = await registerAccount(u, p);
      if (reg.success) {
        const login = await loginAccount(u, p);
        if (login.success && login.username) {
          setUsername(login.username);
        }
        return { ok: true };
      }
      return { ok: false, message: "Registration failed" };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Network error during registration" };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthBusy(true);
    try {
      await logoutAccount();
      setUsername(null);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return {
    username,
    setUsername,
    authBusy,
    apiConnected,
    isBootstrapped,
    handleLogin,
    handleRegister,
    handleLogout,
  };
}
