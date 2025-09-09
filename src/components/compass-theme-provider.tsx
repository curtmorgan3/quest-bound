import { Provider } from '@/components/ui/provider';

export function CompassThemeProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
