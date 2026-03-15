import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useActiveRuleset } from '@/lib/compass-api';
import { isCloudConfigured } from '@/lib/cloud/client';
import { pushToCloudAndMarkSynced, syncRuleset } from '@/lib/cloud/sync/sync-service';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import {
  useRulesetFiltersStore,
  type GridPage,
  type ListPage,
} from '@/stores/ruleset-filters-store';
import { db } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  AppWindow,
  BookOpen,
  CloudAlert,
  CloudCheck,
  CloudUpload,
  FileCode,
  FileSpreadsheet,
  HandFist,
  Home,
  Image,
  LayoutTemplate,
  Newspaper,
  Sword,
  User,
  UserRoundPen,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const RULESET_NAV_ITEMS: {
  title: string;
  path: string;
  icon: typeof BookOpen;
  gridPage?: GridPage;
  listPage?: ListPage;
  scriptsPage?: boolean;
}[] = [
  { title: 'Home', path: 'landing', icon: Home },
  { title: 'Attributes', path: 'attributes', icon: UserRoundPen, gridPage: 'attributes' },
  { title: 'Actions', path: 'actions', icon: HandFist, gridPage: 'actions' },
  { title: 'Items', path: 'items', icon: Sword, gridPage: 'items' },
  { title: 'Charts', path: 'charts', icon: FileSpreadsheet, listPage: 'charts' },
  { title: 'Documents', path: 'documents', icon: Newspaper, listPage: 'documents' },
  { title: 'Windows', path: 'windows', icon: AppWindow, listPage: 'windows' },
  { title: 'Pages', path: 'pages', icon: LayoutTemplate, listPage: 'pages' },
  { title: 'Archetypes', path: 'archetypes', icon: User, listPage: 'archetypes' },
  { title: 'Scripts', path: 'scripts', icon: FileCode, scriptsPage: true },
  { title: 'Assets', path: 'assets', icon: Image, listPage: 'assets' },
];

export function RulesetSidebar() {
  const { activeRuleset } = useActiveRuleset();
  const location = useLocation();
  const getGridFilters = useRulesetFiltersStore((s) => s.getGridFilters);
  const getListFilters = useRulesetFiltersStore((s) => s.getListFilters);
  const getScriptsFilters = useRulesetFiltersStore((s) => s.getScriptsFilters);

  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/campaigns' ||
    location.pathname === '/campaigns/new';

  const rulesetId = activeRuleset?.id;

  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const {
    isCloudSynced,
    isSyncing,
    syncError,
    lastSyncedAt,
    setSyncError,
    pushDialogOpen,
    setPushDialogOpen,
  } = useSyncStateStore();
  const [pushInProgress, setPushInProgress] = useState(false);

  const showCloudSync =
    isCloudConfigured && isAuthenticated && rulesetId && !isHomepage;
  const synced = rulesetId ? isCloudSynced(rulesetId) : false;
  const busy = isSyncing || pushInProgress;
  const isOffline = !navigator.onLine;
  const lastSynced = rulesetId ? lastSyncedAt[rulesetId] : undefined;

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
    if (synced) return 'Cloud sync';
    return 'Push to Cloud';
  };

  const getCloudSyncTooltip = () => {
    if (syncError) return syncError;
    if (isOffline) return 'Offline — sync when back online';
    if (busy) return 'Syncing with Quest Bound Cloud…';
    if (synced && lastSynced) {
      try {
        return `Synced ${formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}`;
      } catch {
        return 'Synced with Quest Bound Cloud';
      }
    }
    if (synced) return 'Synced with Quest Bound Cloud — click to sync now';
    return 'Push to Quest Bound Cloud to sync across devices';
  };

  const handleCloudSyncClick = () => {
    if (!rulesetId) return;
    if (busy || isOffline) return;
    if (syncError) {
      setSyncError(null);
      return;
    }
    if (synced) {
      syncRuleset(rulesetId, db as DB);
    } else {
      setPushDialogOpen(true);
    }
  };

  const handlePushConfirm = async () => {
    if (!rulesetId) return;
    setPushInProgress(true);
    try {
      const result = await pushToCloudAndMarkSynced(rulesetId, db as DB);
      if (!result.error) setPushDialogOpen(false);
    } finally {
      setPushInProgress(false);
    }
  };

  const items = isHomepage
    ? []
    : RULESET_NAV_ITEMS.map((item) => {
        const baseUrl =
          item.path === 'landing' ? `/landing/${rulesetId}` : `/rulesets/${rulesetId}/${item.path}`;
        let url = baseUrl;
        if (rulesetId && item.gridPage) {
          const params = getGridFilters(rulesetId, item.gridPage);
          if (params && (params.filter || params.sort)) {
            const q = new URLSearchParams();
            if (params.filter) q.set('filter', params.filter);
            if (params.sort) q.set('sort', params.sort);
            url = `${baseUrl}?${q.toString()}`;
          }
        } else if (rulesetId && item.listPage) {
          const params = getListFilters(rulesetId, item.listPage);
          if (params && (params.title || params.category)) {
            const q = new URLSearchParams();
            if (params.title) q.set('title', params.title);
            if (params.category) q.set('category', params.category);
            url = `${baseUrl}?${q.toString()}`;
          }
        } else if (rulesetId && item.scriptsPage) {
          const params = getScriptsFilters(rulesetId);
          if (params && (params.q || params.type || params.category)) {
            const q = new URLSearchParams();
            if (params.q) q.set('q', params.q);
            if (params.type) q.set('type', params.type);
            if (params.category) q.set('category', params.category);
            url = `${baseUrl}?${q.toString()}`;
          }
        }
        return { ...item, url, baseUrl };
      });

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {showCloudSync && (
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={handleCloudSyncClick}
                    disabled={!syncError && (isOffline || busy)}
                    data-testid='sidebar-cloud-sync'>
                    {(() => {
                      const Icon = getCloudSyncIcon();
                      return (
                        <Icon
                          className={
                            syncError || isOffline
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
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  {getCloudSyncTooltip()}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          )}
          {items.map((item) => {
            const isActive = location.pathname === item.baseUrl;
            return (
              <SidebarMenuItem key={item.title} className={isActive ? 'text-primary' : ''}>
                <SidebarMenuButton asChild>
                  <Link to={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
      {showCloudSync && rulesetId && (
        <AlertDialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Push to Quest Bound Cloud</AlertDialogTitle>
              <AlertDialogDescription>
                This will upload your ruleset to Quest Bound Cloud so you can access it on other
                devices. You can sync changes anytime after this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pushInProgress}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handlePushConfirm();
                }}
                disabled={pushInProgress}>
                {pushInProgress ? 'Uploading…' : 'Push to Cloud'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarGroup>
  );
}
