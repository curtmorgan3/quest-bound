import { createContext } from 'react';

type EnvContext = {
  environment: string;
  domain: string;
  maintenance: string[];
};

export const EnvContext = createContext<EnvContext>(null!);
export const EnvProvider = EnvContext.Provider;
