import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ViewModeState {
  viewMode: 'admin' | 'juror';
  isImpersonating: boolean;
  impersonatedJurorId: string | null;
  impersonatedJurorName: string | null;
}

interface ViewModeContextType extends ViewModeState {
  switchToJurorView: (jurorId: string, jurorName: string) => void;
  switchToAdminView: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = 'cm_view_mode';

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useUserProfile();
  
  const [state, setState] = useState<ViewModeState>(() => {
    // Load from sessionStorage on mount
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load view mode from storage:', error);
    }
    return {
      viewMode: 'admin',
      isImpersonating: false,
      impersonatedJurorId: null,
      impersonatedJurorName: null,
    };
  });

  // Persist to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save view mode to storage:', error);
    }
  }, [state]);

  // Reset to admin view if user is not an admin
  useEffect(() => {
    if (profile && profile.role !== 'admin' && state.isImpersonating) {
      setState({
        viewMode: 'admin',
        isImpersonating: false,
        impersonatedJurorId: null,
        impersonatedJurorName: null,
      });
    }
  }, [profile, state.isImpersonating]);

  const switchToJurorView = (jurorId: string, jurorName: string) => {
    // Only allow admins to switch views
    if (profile?.role !== 'admin') {
      console.warn('Only admins can switch to juror view');
      return;
    }

    setState({
      viewMode: 'juror',
      isImpersonating: true,
      impersonatedJurorId: jurorId,
      impersonatedJurorName: jurorName,
    });
  };

  const switchToAdminView = () => {
    setState({
      viewMode: 'admin',
      isImpersonating: false,
      impersonatedJurorId: null,
      impersonatedJurorName: null,
    });
  };

  return (
    <ViewModeContext.Provider
      value={{
        ...state,
        switchToJurorView,
        switchToAdminView,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
