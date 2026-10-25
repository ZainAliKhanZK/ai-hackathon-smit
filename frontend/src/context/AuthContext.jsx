import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, getStoredUser, setStoredUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    checkAppStatus();
  }, []);

  async function checkAppStatus() {
    try {
      const statusRes = await api.checkSetupStatus();
      setSetupNeeded(statusRes.is_setup_needed);

      if (token && !statusRes.is_setup_needed) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setStoredUser(profile);
        } catch {
          logout();
        }
      }
    } catch (err) {
      console.error("Setup check error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    setAuthToken(data.access_token);
    setToken(data.access_token);
    
    // Fetch full profile
    const profile = await api.getMe();
    setUser(profile);
    setStoredUser(profile);
    return profile;
  }

  function logout() {
    setAuthToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const profile = await api.getMe();
      setUser(profile);
      setStoredUser(profile);
      return profile;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      setupNeeded,
      setSetupNeeded,
      login,
      logout,
      checkAppStatus,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
