// import { RenderNotifications } from '@/libs/compass-core-composites';
// import { Onboarding } from '@/pages/onboarding';
// import { QuickCreateModal } from '@/pages/ruleset/components';
import { Loading } from '@/components';
import { useCurrentUser } from '@/lib/compass-api';
import { SignIn } from '@/pages';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

export function Layout() {
  const { currentUser, loading } = useCurrentUser();

  const [searchParams] = useSearchParams();

  const { pathname } = useLocation();

  const isHomePage = pathname === '/';

  const shouldCollapseSideNav =
    isHomePage ||
    [/\/sheet-templates\/[\w-]+/, /\/page-templates\/[\w-]+/].some((path) => path.test(pathname)) ||
    searchParams.get('selected') === 'sheet' ||
    searchParams.get('selected') === 'simple-sheet';

  const permanentNav = !!currentUser && !shouldCollapseSideNav;

  return (
    <>
      {/* {currentUser && <Navigation permanentSideNav={permanentNav} />} */}
      <main
        style={{
          marginLeft: permanentNav && !loading ? 240 : 0,
          display: 'grid',
          minHeight: '60vh',
          height: 'calc(100dvh - 60px)',
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr',
          paddingTop: currentUser || loading ? '60px' : 0,
          width: permanentNav && !loading ? 'calc(100vw - 240px)' : '100vw',
        }}>
        {loading ? <Loading /> : currentUser ? <Outlet /> : <SignIn />}
      </main>
      {/* <RenderNotifications /> */}
    </>
  );
}
