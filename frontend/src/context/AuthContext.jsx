import React, { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5005';
export const API_BASE = `${BACKEND_URL}/api`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('studyswap_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMeWithToken = async (authToken) => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s max timeout

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        console.warn("Auth token verification returned non-OK response:", response.status);
        logout();
      }
    } catch (err) {
      console.warn("Auth fetch failed or timed out:", err.message);
      // If token is invalid or server unreachable, gracefully reset session
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
        // Keep current state or unblock loading without crashing
      } else {
        logout();
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    const initialToken = localStorage.getItem('studyswap_token');
    if (initialToken) {
      fetchMeWithToken(initialToken);
    } else {
      setLoading(false);
    }

    let subscription = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session && session.access_token) {
            localStorage.setItem('studyswap_token', session.access_token);
            setToken(session.access_token);
            fetchMeWithToken(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('studyswap_token');
          setToken(null);
          setUser(null);
          setLoading(false);
        }
      });
      subscription = data?.subscription;
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!supabase) {
        throw new Error('Google Sign-In is not enabled on this environment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) throw error;
    } catch (err) {
      const msg = typeof err.message === 'string' ? err.message : JSON.stringify(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

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
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || 'Login failed.');
        throw new Error(msg);
      }
      localStorage.setItem('studyswap_token', data.token);
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
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || 'Registration failed.');
        throw new Error(msg);
      }
      if (data.requiresConfirmation) {
        return { requiresConfirmation: true };
      }
      localStorage.setItem('studyswap_token', data.token);
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
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link.');
      }
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
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('studyswap_token');
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
      const response = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }
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
      if (!response.ok) {
        throw new Error(data.error || 'Wallet deposit failed.');
      }
      setUser(prev => ({ ...prev, balance: data.balance }));
      return data.balance;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Auth refresh failed:", err);
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
      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch role.');
      }
      localStorage.setItem('studyswap_token', data.token);
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
      user,
      token,
      loading,
      error,
      login,
      register,
      logout,
      updateProfile,
      depositWallet,
      refreshUser,
      switchRole,
      setUser,
      forgotPassword,
      resetPassword,
      loginWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
