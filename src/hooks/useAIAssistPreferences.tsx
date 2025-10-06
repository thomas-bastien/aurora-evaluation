import { useState } from 'react';

export const useAIAssistPreferences = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('ai_assist_enabled');
      return stored !== null ? JSON.parse(stored) : true; // Default ON
    } catch {
      return true;
    }
  });

  const toggleEnabled = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    try {
      localStorage.setItem('ai_assist_enabled', JSON.stringify(newValue));
    } catch (error) {
      console.error('Failed to save AI assist preference:', error);
    }
  };

  return { isEnabled, toggleEnabled };
};
