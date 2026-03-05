import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useActiveRuleset } from '@/lib/compass-api';
import {
  AppWindow,
  BookOpen,
  FileCode,
  FileSpreadsheet,
  HandFist,
  Image,
  LayoutTemplate,
  Map,
  Newspaper,
  Sword,
  User,
  UserRoundPen,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  useRulesetFiltersStore,
  type GridPage,
  type ListPage,
} from '@/stores/ruleset-filters-store';

const HOMEPAGE_ITEMS = [
  { title: 'Rulesets', url: '/rulesets', icon: BookOpen },
  { title: 'Characters', url: '/characters', icon: Users },
  { title: 'Campaigns', url: '/campaigns', icon: Map },
];

const RULESET_NAV_ITEMS: {
  title: string;
  path: string;
  icon: typeof BookOpen;
  gridPage?: GridPage;
  listPage?: ListPage;
  scriptsPage?: boolean;
}[] = [
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
  const { open } = useSidebar();
  const location = useLocation();
  const campaignsEnabled = useFeatureFlag('campaigns', false);
  const getGridFilters = useRulesetFiltersStore((s) => s.getGridFilters);
  const getListFilters = useRulesetFiltersStore((s) => s.getListFilters);
  const getScriptsFilters = useRulesetFiltersStore((s) => s.getScriptsFilters);

  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/campaigns' ||
    location.pathname === '/campaigns/new';

  const homepageItems = HOMEPAGE_ITEMS.filter((item) => {
    if (item.title === 'Campaigns') return campaignsEnabled;
    return true;
  });

  const rulesetId = activeRuleset?.id;

  const items = isHomepage
    ? homepageItems
    : RULESET_NAV_ITEMS.map((item) => {
        const baseUrl = `/rulesets/${rulesetId}/${item.path}`;
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
          if (params && (params.q || params.type)) {
            const q = new URLSearchParams();
            if (params.q) q.set('q', params.q);
            if (params.type) q.set('type', params.type);
            url = `${baseUrl}?${q.toString()}`;
          }
        }
        return { title: item.title, url, icon: item.icon };
      });

  const title = activeRuleset?.title ?? 'Quest Bound';

  return (
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
          {items.map((item) => {
            const isActive = location.pathname.includes(item.title.toLowerCase());
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
    </SidebarGroup>
  );
}
