import React, { createContext, useContext, ReactNode } from 'react';
import { demoStartups } from '@/data/demo/demoStartups';
import { demoJurors } from '@/data/demo/demoJurors';
import { demoScreeningEvaluations, demoPitchingEvaluations } from '@/data/demo/demoEvaluations';
import { demoScreeningAssignments, demoPitchingAssignments } from '@/data/demo/demoAssignments';
import { demoRounds, demoStartupRoundStatuses } from '@/data/demo/demoRounds';
import { demoCohortSettings } from '@/data/demo/demoCohortSettings';

interface DemoUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface DemoProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'vc';
  organization?: string;
  created_at: string;
  updated_at: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoUser: DemoUser | null;
  demoProfile: DemoProfile | null;
  demoData: {
    startups: typeof demoStartups;
    jurors: typeof demoJurors;
    screeningEvaluations: typeof demoScreeningEvaluations;
    pitchingEvaluations: typeof demoPitchingEvaluations;
    screeningAssignments: typeof demoScreeningAssignments;
    pitchingAssignments: typeof demoPitchingAssignments;
    rounds: typeof demoRounds;
    startupRoundStatuses: typeof demoStartupRoundStatuses;
    cohortSettings: typeof demoCohortSettings;
  };
  setDemoRole: (role: 'admin' | 'vc', jurorId?: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemoContext = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
};

interface DemoProviderProps {
  children: ReactNode;
}

export const DemoProvider: React.FC<DemoProviderProps> = ({ children }) => {
  const [demoUser, setDemoUser] = React.useState<DemoUser | null>(null);
  const [demoProfile, setDemoProfile] = React.useState<DemoProfile | null>(null);

  const setDemoRole = (role: 'admin' | 'vc', jurorId?: string) => {
    if (role === 'admin') {
      const adminUser: DemoUser = {
        id: 'demo-admin-1',
        email: 'admin@aurora-demo.com',
        user_metadata: {
          full_name: 'Demo Administrator'
        }
      };
      
      const adminProfile: DemoProfile = {
        id: 'demo-admin-profile-1',
        user_id: 'demo-admin-1',
        full_name: 'Demo Administrator',
        role: 'admin',
        organization: 'Aurora Evaluation Platform',
        created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
        updated_at: new Date('2024-01-01T00:00:00Z').toISOString()
      };
      
      setDemoUser(adminUser);
      setDemoProfile(adminProfile);
    } else if (role === 'vc' && jurorId) {
      const selectedJuror = demoJurors.find(j => j.id === jurorId);
      if (selectedJuror) {
        const vcUser: DemoUser = {
          id: selectedJuror.user_id,
          email: selectedJuror.email,
          user_metadata: {
            full_name: selectedJuror.name
          }
        };
        
        const vcProfile: DemoProfile = {
          id: `demo-profile-${selectedJuror.user_id}`,
          user_id: selectedJuror.user_id,
          full_name: selectedJuror.name,
          role: 'vc',
          organization: selectedJuror.company,
          created_at: selectedJuror.created_at,
          updated_at: selectedJuror.updated_at
        };
        
        setDemoUser(vcUser);
        setDemoProfile(vcProfile);
      }
    }
  };

  const demoData = {
    startups: demoStartups,
    jurors: demoJurors,
    screeningEvaluations: demoScreeningEvaluations,
    pitchingEvaluations: demoPitchingEvaluations,
    screeningAssignments: demoScreeningAssignments,
    pitchingAssignments: demoPitchingAssignments,
    rounds: demoRounds,
    startupRoundStatuses: demoStartupRoundStatuses,
    cohortSettings: demoCohortSettings
  };

  const value: DemoContextType = {
    isDemoMode: true,
    demoUser,
    demoProfile,
    demoData,
    setDemoRole
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};