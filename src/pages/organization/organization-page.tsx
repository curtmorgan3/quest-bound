import { isCloudConfigured } from '@/lib/cloud/client';
import { cn } from '@/lib/utils';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { FileText, Library, Loader2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  OrganizationAdminLogoSidebar,
  type OrganizationAdminLogoSidebarProps,
} from './organization-admin-logo-sidebar';
import { OrganizationSettings, type OrganizationAdminSection } from './organization-settings';

function isAdminSection(s: string | undefined): s is OrganizationAdminSection {
  return s === 'details' || s === 'members' || s === 'content';
}

export function OrganizationPage() {
  const navigate = useNavigate();
  const { section } = useParams<{ section: string }>();
  const { isAuthenticated, cloudSyncEnabled, isCloudSyncEligibilityLoading } = useCloudAuthStore();

  const [roleTab, setRoleTab] = useState<'admin' | 'member'>('admin');
  const [hasAdminOrg, setHasAdminOrg] = useState<boolean | null>(null);
  const [adminLogoSidebar, setAdminLogoSidebar] =
    useState<OrganizationAdminLogoSidebarProps | null>(null);

  const onAdminLogoSidebarChange = useCallback(
    (props: OrganizationAdminLogoSidebarProps | null) => {
      setAdminLogoSidebar(props);
    },
    [],
  );

  const adminSection: OrganizationAdminSection = isAdminSection(section) ? section : 'details';

  useEffect(() => {
    if (section && !isAdminSection(section)) {
      navigate('/organization/details', { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    if (hasAdminOrg === false && adminSection !== 'details') {
      navigate('/organization/details', { replace: true });
    }
  }, [hasAdminOrg, adminSection, navigate]);

  const showSidebar = hasAdminOrg === true && roleTab === 'admin';

  if (!isCloudConfigured) {
    return (
      <div className='p-4'>
        <p className='text-sm text-muted-foreground'>
          Quest Bound Cloud is not configured for this build.
        </p>
      </div>
    );
  }

  if (isCloudSyncEligibilityLoading) {
    return (
      <div className='flex items-center gap-2 p-4 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        Loading…
      </div>
    );
  }

  if (!isAuthenticated || !cloudSyncEnabled) {
    return (
      <div className='flex max-w-md flex-col gap-3 p-4'>
        <p className='text-sm text-muted-foreground'>
          Organization settings need Quest Bound Cloud with sync enabled for your account. Sign in
          and enable cloud from Settings if you have access.
        </p>
      </div>
    );
  }

  const navLinkClass = (active: boolean) =>
    cn(
      'ring-sidebar-ring flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
      active
        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    );

  return (
    <div className='min-h-[100%] overflow-auto'>
      <div className='flex min-h-0 gap-8'>
        {showSidebar ? (
          <div className='border-sidebar-border bg-sidebar text-sidebar-foreground flex w-[11rem] shrink-0 h-[100dvh] flex-col border p-2'>
            {adminLogoSidebar ? (
              <OrganizationAdminLogoSidebar {...adminLogoSidebar} />
            ) : null}
            <nav className='mt-1 flex flex-col gap-0.5' aria-label='Organization sections'>
              <Link
                to='/organization/details'
                className={navLinkClass(adminSection === 'details' && roleTab === 'admin')}>
                <FileText className='shrink-0' />
                <span className='truncate'>Details</span>
              </Link>
              <Link
                to='/organization/members'
                className={navLinkClass(adminSection === 'members' && roleTab === 'admin')}>
                <Users className='shrink-0' />
                <span className='truncate'>Members</span>
              </Link>
              <Link
                to='/organization/content'
                className={navLinkClass(adminSection === 'content' && roleTab === 'admin')}>
                <Library className='shrink-0' />
                <span className='truncate'>Content</span>
              </Link>
            </nav>
          </div>
        ) : null}
        <div className='flex min-h-[70vh] min-w-0 flex-1 flex-col gap-4 overflow-auto py-1'>
          <OrganizationSettings
            adminSection={adminSection}
            roleTab={roleTab}
            onRoleTabChange={setRoleTab}
            onAdminOrganizationResolved={(org) => setHasAdminOrg(org !== null)}
            onAdminLogoSidebarChange={onAdminLogoSidebarChange}
          />
        </div>
      </div>
    </div>
  );
}

export function OrganizationIndexRedirect() {
  return <Navigate to='/organization/details' replace />;
}
