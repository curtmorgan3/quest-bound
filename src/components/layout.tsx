import { AppSidebar, Loading } from '@/components';
import { useUsers } from '@/lib/compass-api';
import { SignIn } from '@/pages';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from './ui/sidebar';
import { PWAInstallPrompt } from './pwa-install-prompt';

export function Layout() {
  const { currentUser, loading } = useUsers();

  return loading ? (
    <Loading />
  ) : !currentUser ? (
    <SignIn />
  ) : (
    <SidebarProvider>
      <AppSidebar />
      <main
        style={{
          display: 'grid',
          height: '100vh',
          width: '100vw',
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr',
        }}>
        <Outlet />
      </main>
      <PWAInstallPrompt />
    </SidebarProvider>
  );
}
