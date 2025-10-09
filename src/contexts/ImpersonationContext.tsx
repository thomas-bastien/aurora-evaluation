import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ImpersonationContextType {
  impersonatedJurorId: string | null;
  impersonatedJurorName: string | null;
  isImpersonating: boolean;
  startImpersonation: (jurorId: string, jurorName: string) => void;
  stopImpersonation: () => void;
}

export const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedJurorId: null,
  impersonatedJurorName: null,
  isImpersonating: false,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

interface ImpersonationProviderProps {
  children: ReactNode;
}

const IMPERSONATION_KEY = 'admin_impersonation';

export const ImpersonationProvider = ({ children }: ImpersonationProviderProps) => {
  const { user } = useAuth();
  const [impersonatedJurorId, setImpersonatedJurorId] = useState<string | null>(null);
  const [impersonatedJurorName, setImpersonatedJurorName] = useState<string | null>(null);

  // Load impersonation state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        const { jurorId, jurorName } = JSON.parse(stored);
        setImpersonatedJurorId(jurorId);
        setImpersonatedJurorName(jurorName);
      } catch (error) {
        console.error('Error loading impersonation state:', error);
        sessionStorage.removeItem(IMPERSONATION_KEY);
      }
    }
  }, []);

  const startImpersonation = (jurorId: string, jurorName: string) => {
    if (!user) {
      console.error('Must be logged in to impersonate');
      return;
    }

    setImpersonatedJurorId(jurorId);
    setImpersonatedJurorName(jurorName);
    
    // Persist to sessionStorage (clears on browser close)
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify({ jurorId, jurorName }));
  };

  const stopImpersonation = () => {
    setImpersonatedJurorId(null);
    setImpersonatedJurorName(null);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  };

  const isImpersonating = impersonatedJurorId !== null;

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedJurorId,
        impersonatedJurorName,
        isImpersonating,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};
