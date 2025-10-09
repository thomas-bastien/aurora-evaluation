import { useContext } from 'react';
import { ImpersonationContext } from '@/contexts/ImpersonationContext';

export const useImpersonation = () => {
  return useContext(ImpersonationContext);
};
