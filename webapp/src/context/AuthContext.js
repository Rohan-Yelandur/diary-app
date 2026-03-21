import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as authSignIn, signOut as authSignOut, isAuthenticated } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize state based on whether we already have a valid token in sessionStorage
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initGoogleAuth(
      // onSuccess
      () => {
        setAuthenticated(true);
        setLoading(false);
      },
      // onError
      (err) => {
        console.error('Auth error:', err);
        setAuthenticated(false);
        setLoading(false);
      }
    )
      .then(() => {
        // GIS loaded — check if we have a valid session
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to init Google Auth:', err);
        setLoading(false);
      });
  }, []);

  const signIn = useCallback(() => {
    authSignIn();
  }, []);

  const signOut = useCallback(() => {
    authSignOut();
    setAuthenticated(false);
  }, []);

  const value = {
    authenticated,
    loading,
    signIn,
    signOut,
    isAuthenticated: () => isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
