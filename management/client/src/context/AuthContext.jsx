import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [shop, setShop] = useState(() => {
    const raw = localStorage.getItem('shop');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token, u, s) => {
    if (token) localStorage.setItem('token', token);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    if (s) localStorage.setItem('shop', JSON.stringify(s));
    else localStorage.removeItem('shop');
    setUser(u || null);
    setShop(s || null);
  };

  // On app start, re-load role/permissions from the server (they may have changed since the last login) and extend the session.
  // A revoked/expired token gets a 401 here and the api interceptor sends the user to /login.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    authApi.refresh().then(({ data }) => persist(data.token, data.user, data.shop)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authApi.login(email, password);
      persist(data.token, data.user, data.shop);
      return { success: true, mustChangePassword: !!data.user.mustChangePassword };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password. Please try again.' };
    }
  }, []);

  const register = useCallback(async (fullName, email, password, phone) => {
    try {
      const { data } = await authApi.register(fullName, email, password, phone);
      persist(data.token, data.user, null);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Could not create account.' };
    }
  }, []);

  const registerShop = useCallback(async (payload) => {
    try {
      const { data } = await authApi.registerShop(payload);
      persist(null, data.user, data.shop);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Could not create shop.' };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const { data } = await authApi.changePassword(currentPassword, newPassword);
      persist(data.token, data.user, data.shop);
      return { success: true, shop: data.shop };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Could not change password.' };
    }
  }, []);

  // Logout also revokes the session on the server (all devices), then clears local state.
  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('shop');
    setUser(null);
    setShop(null);
  }, []);

  // UI-only permission check (hides buttons/menus). The SERVER is the real enforcement.
  const can = useCallback((perm) => !!user?.permissions?.includes(perm), [user]);
  const canAny = useCallback((...perms) => perms.some((p) => user?.permissions?.includes(p)), [user]);

  const value = {
    currentUser: user,
    currentShop: shop,
    isAuthenticated: !!user,
    hasShop: !!shop,
    can,
    canAny,
    login,
    register,
    registerShop,
    changePassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
