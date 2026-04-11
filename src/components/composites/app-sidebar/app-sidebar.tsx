import { CloudSyncMenuDialogs } from '@/components/composites/cloud-sync-menu-dialogs';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { isCloudConfigured } from '@/lib/cloud/client';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { useActiveRuleset, useUsers } from '@/lib/compass-api';
import { Settings } from '@/pages';
import { DiceContext, useCloudSyncReviewStore, useExternalRulesetGrantStore } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  Building2,
  CloudAlert,
  CloudCheck,
  CloudUpload,
  Dices,
  FolderOpen,
  HelpCircle,
  Settings as SettingsIcon,
  User,
  Wrench,
} from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '../../ui/drawer';
import { CampaignSidebar } from './campaign-sidebar';
import { CharacterSidebar } from './character-sidebar';
import { RulesetSidebar } from './ruleset-sidebar';

function docsPageFromRoute(path: string): string {
  if (path.includes('/rulesets') && !path.includes('/characters')) {
    if (path.includes('/attributes')) return 'attributes';
    if (path.includes('/actions')) return 'actions';
    if (path.includes('/items')) return 'items';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/charts')) return 'charts';
    if (path.includes('/windows')) return 'windows';
    if (path.includes('/pages')) return 'pages';
    if (path.includes('/scripts')) return 'scripts';
    if (path.includes('/archetypes')) return 'archetypes';
    return 'rulesets';
  }
  if (path.includes('/characters')) {
    if (path.includes('/documents') || path.includes('/chart/'))
      return path.includes('/chart/') ? 'charts' : 'documents';
    return 'characters';
  }
  return 'rulesets';
}

export function AppSidebar() {
  const { currentUser } = useUsers();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const { setDicePanelOpen } = useContext(DiceContext);
  const { activeRuleset } = useActiveRuleset();

  const isLandingRoute = location.pathname.startsWith('/landing/');
  const isOrganizationRoute = location.pathname.startsWith('/organization');
  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/campaigns';

  const isCharacterRoute = location.pathname.startsWith('/characters/');

  const isDevTools = location.pathname.startsWith('/dev');

  const isCampaignsRoute =
    location.pathname.startsWith('/campaigns/') && location.pathname !== '/campaigns/new';

  const title =
    location.pathname === '/rulesets' ||
    isOrganizationRoute ||
    !activeRuleset?.title
      ? 'Quest Bound'
      : activeRuleset.title;

  useEffect(() => {
    const storedState = localStorage.getItem('qb.sidebarCollapsed');
    if (storedState !== null) {
      setOpen(storedState === 'false');
    }
  }, [setOpen]);

  const helpDocsUrl = `https://docs.questbound.com/docs/${docsPageFromRoute(location.pathname)}`;

  const [settingsOpen, setSettingsOpen] = useState(false);

  const rulesetId = activeRuleset?.id;
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const {
    isCloudSynced,
    isSyncing,
    syncError,
    setSyncError,
    pushDialogOpen,
    setPushDialogOpen,
  } = useSyncStateStore();
  const planning = useCloudSyncReviewStore((s) => s.planning);
  const committing = useCloudSyncReviewStore((s) => s.committing);
  const reviewOpen = useCloudSyncReviewStore((s) => s.open);

  const showOrganizationNav =
    isCloudConfigured &&
    isAuthenticated &&
    cloudSyncEnabled &&
    !cloudSyncEligibilityLoading;

  const externalGrantBlocksRemoteSync = useExternalRulesetGrantStore((s) =>
    rulesetId ? s.permissionByRulesetId[rulesetId] != null : false,
  );

  const showCloudSync =
    isCloudConfigured &&
    isAuthenticated &&
    cloudSyncEnabled &&
    !cloudSyncEligibilityLoading &&
    rulesetId &&
    !externalGrantBlocksRemoteSync &&
    !isHomepage &&
    !isLandingRoute &&
    !isCharacterRoute &&
    !isCampaignsRoute &&
    !isDevTools &&
    !isOrganizationRoute;
  const synced = rulesetId ? isCloudSynced(rulesetId) : false;
  const busy = isSyncing || planning || committing || reviewOpen;
  const isOffline = !navigator.onLine;

  const getCloudSyncIcon = () => {
    if (syncError || isOffline) return CloudAlert;
    if (busy) return CloudUpload;
    if (synced) return CloudCheck;
    return CloudUpload;
  };

  const getCloudSyncLabel = () => {
    if (syncError) return 'Sync error';
    if (isOffline) return 'Offline';
    if (busy) return 'Syncing…';
    return 'Cloud sync';
  };

  const handleCloudSyncClick = () => {
    if (!rulesetId) return;
    if (busy || isOffline) return;
    if (syncError) {
      setSyncError(null);
      return;
    }
    setPushDialogOpen(true);
  };

  useEffect(() => {
    setSettingsOpen(false);
  }, [location.pathname]);

  const sidebarContent = isLandingRoute ? null : isCharacterRoute ? (
    <CharacterSidebar />
  ) : isCampaignsRoute ? (
    <CampaignSidebar />
  ) : isDevTools || isOrganizationRoute ? null : (
    <RulesetSidebar />
  );

  return (
    <Drawer
      autoFocus
      direction='bottom'
      open={settingsOpen}
      onOpenChange={setSettingsOpen}>
      <Sidebar collapsible='icon'>
        <SidebarGroup>
          <div className='flex items-center justify-left'>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            {open && (
              <SidebarTrigger onClick={() => localStorage.setItem('qb.sidebarCollapsed', 'true')} />
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {!open && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <SidebarTrigger
                      onClick={() => localStorage.setItem('qb.sidebarCollapsed', 'false')}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarContent>{sidebarContent}</SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={`/rulesets`} data-testid='nav-home'>
                  <FolderOpen className='w-4 h-4' />
                  <span>Open</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {!isHomepage && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setDicePanelOpen(true)} data-testid='nav-dice'>
                  <Dices />
                  <span>Dice</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {showOrganizationNav && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to='/organization/details' data-testid='nav-organization'>
                    <Building2 className='h-4 w-4' />
                    <span>Organization</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {showCloudSync && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleCloudSyncClick}
                  disabled={!syncError && (isOffline || busy)}
                  data-testid='sidebar-cloud-sync'>
                  {(() => {
                    const Icon = getCloudSyncIcon();
                    return (
                      <Icon
                        className={
                          syncError || isOffline || !synced
                            ? 'text-destructive'
                            : busy
                              ? 'animate-pulse'
                              : ''
                        }
                      />
                    );
                  })()}
                  <span>{getCloudSyncLabel()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <DrawerTrigger asChild>
                <SidebarMenuButton>
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DrawerTrigger>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a
                  href={helpDocsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  data-testid='nav-help'>
                  <HelpCircle />
                  <span>Help</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {localStorage.getItem('dev.tools') === 'true' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to='/dev-tools'>
                    <Wrench />
                    <span>Dev Tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <div className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2`} data-testid='user-menu'>
            <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
              <AvatarImage src={currentUser?.image ?? ''} alt={currentUser?.username} />
              <AvatarFallback>
                <User className='size-4 text-muted-foreground' />
              </AvatarFallback>
            </Avatar>
            {open && <p>{currentUser?.username}</p>}
          </div>
        </SidebarFooter>
      </Sidebar>

      <DrawerContent className='w-[100vw]'>
        <DrawerTitle className='sr-only'>Settings</DrawerTitle>
        <DrawerDescription className='sr-only'>
          Application, ruleset, campaign, and character settings.
        </DrawerDescription>
        <Settings />
      </DrawerContent>
      {showCloudSync && rulesetId && (
        <CloudSyncMenuDialogs
          rulesetId={rulesetId}
          open={pushDialogOpen}
          onOpenChange={setPushDialogOpen}
          busy={busy}
          isOffline={isOffline}
        />
      )}
    </Drawer>
  );
}
