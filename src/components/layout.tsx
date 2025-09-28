import { AppSidebar, Loading } from '@/components';
import { useUsers } from '@/lib/compass-api';
import { SignIn } from '@/pages';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from './ui/sidebar';
import { Toaster } from './ui/sonner';

export function Layout() {
  const { currentUser, loading } = useUsers();

  return loading ? (
    <Loading />
  ) : !currentUser ? (
    <SignIn />
  ) : (
    <SidebarProvider defaultOpen={false}>
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
      <Toaster />
    </SidebarProvider>
  );
}
