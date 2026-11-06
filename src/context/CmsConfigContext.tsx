import React, { createContext, useContext } from 'react';
import { LandingPageConfig } from '../types';

const CmsConfigContext = createContext<LandingPageConfig | null>(null);

export const CmsConfigProvider: React.FC<{ config?: LandingPageConfig | null; children: React.ReactNode }> = ({ config, children }) => (
  <CmsConfigContext.Provider value={config ?? null}>{children}</CmsConfigContext.Provider>
);

export function useCmsConfig(): LandingPageConfig {
  const config = useContext(CmsConfigContext);
  if (!config) throw new Error('CmsConfigProvider chưa có cấu hình authoritative.');
  return config;
}
