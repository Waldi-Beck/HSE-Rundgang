import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_REGISTER_SETTINGS } from '../data/register';
import { db } from '../db';
import type { RegisterSettings } from '../lib/types';

const SettingsContext = createContext<RegisterSettings>(DEFAULT_REGISTER_SETTINGS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get('app'));
  return <SettingsContext.Provider value={settings ?? DEFAULT_REGISTER_SETTINGS}>{children}</SettingsContext.Provider>;
}

export const useRegisterSettings = () => useContext(SettingsContext);
