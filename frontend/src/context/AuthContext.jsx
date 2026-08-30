import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5005';
export const API_BASE = `${BACKEND_URL}/api`;
const TOKEN_KEY = 'broplz_token';

// Initialize supabase safely — never throw at module level
let supabase = null;
try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.warn('Supabase init failed:', e.message);
  supabase = null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Safely set state only when mounted
  const safeSet = (setter) => (value) => {
    if (isMounted.current) setter(value);
  };

  const fetchMeWithToken = async (authToken) => {
    if (!authToken) {
      safeSet(setLoading)(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!isMounted.current) return;
      const data = await response.json();
      if (response.ok && data.user) {
        safeSet(setUser)(data.user);
        safeSet(setToken)(authToken);
        localStorage.setItem(TOKEN_KEY, authToken);
      } else {
        // Token invalid — clear it silently
        localStorage.removeItem(TOKEN_KEY);
        safeSet(setUser)(null);
        safeSet(setToken)(null);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (!isMounted.current) return;
      console.warn('Auth check failed/timed out:', err.message);
      // On network failure, don't destroy the stored token (user may be offline)
      // Just unblock the UI
    } finally {
      clearTimeout(timeoutId);
      safeSet(setLoading)(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // Hard safety timer — UI never stays stuck beyond 3 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted.current) setLoading(false);
    }, 3000);

    const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('studyswap_token');
    if (storedToken) {
      fetchMeWithToken(storedToken);
    } else {
      setLoading(false);
    }

    // Set up Supabase auth state listener only if supabase is configured
    let subscription = null;
    if (supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted.current) return;

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.access_token) {
              fetchMeWithToken(session.access_token);
            }
          } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem(TOKEN_KEY);
            safeSet(setToken)(null);
            safeSet(setUser)(null);
            safeSet(setLoading)(false);
          }
          // INITIAL_SESSION: handled by storedToken check above — no action needed
        });
        subscription = data?.subscription;
      } catch (e) {
        console.warn('Supabase auth listener error:', e.message);
      }
    }

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimer);
      if (subscription) {
        try { subscription.unsubscribe(); } catch (e) {}
      }
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Login failed.');
        throw new Error(msg);
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = typeof err.message === 'string' ? err.message : JSON.stringify(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Registration failed.');
        throw new Error(msg);
      }
      if (data.requiresConfirmation) {
        return { requiresConfirmation: true };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = typeof err.message === 'string' ? err.message : JSON.stringify(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      if (!supabase) {
        const msg = 'Google Sign-In is not available in this environment.';
        setError(msg);
        return { error: msg };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` }
      });
      if (error) {
        const msg = error.message || 'Google OAuth failed.';
        setError(msg);
        return { error: msg };
      }
    } catch (err) {
      const msg = err?.message || 'Google Sign-In error occurred.';
      setError(msg);
      return { error: msg };
    }
  };

  const forgotPassword = async (email, redirectTo) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reset link.');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (access_token, new_password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, new_password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password.');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const currentToken = token || localStorage.getItem(TOKEN_KEY);
      const response = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile.');
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const depositWallet = async (amount, paymentMethod) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/users/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, paymentMethod })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Wallet deposit failed.');
      setUser(prev => ({ ...prev, balance: data.balance }));
      return data.balance;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);
    if (!currentToken) return;
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      const data = await response.json();
      if (response.ok) setUser(data.user);
    } catch (err) {
      console.warn('Auth refresh failed:', err.message);
    }
  };

  const switchRole = async (newRole) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/users/switch-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to switch role.');
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, error,
      login, register, logout, loginWithGoogle,
      updateProfile, depositWallet, refreshUser, switchRole,
      setUser, forgotPassword, resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
