import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveRuleset } from '@/lib/compass-api';
import {
  useRulesetFiltersStore,
  type GridPage,
  type ListPage,
} from '@/stores/ruleset-filters-store';
import {
  AppWindow,
  BookOpen,
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
    </SidebarGroup>
  );
}
