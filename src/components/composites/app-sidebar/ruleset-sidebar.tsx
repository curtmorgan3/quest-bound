import {
  AppWindow,
  BookOpen,
  FileCode,
  FileSpreadsheet,
  Globe,
  HandFist,
  LayoutTemplate,
  Map,
  Newspaper,
  Sword,
  User,
  UserRoundPen,
  Users,
} from 'lucide-react';
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
import { useActiveRuleset } from '@/lib/compass-api';
import { Link, useLocation } from 'react-router-dom';

const HOMEPAGE_ITEMS = [
  { title: 'Rulesets', url: '/rulesets', icon: BookOpen },
  { title: 'Characters', url: '/characters', icon: Users },
  { title: 'Worlds', url: '/worlds', icon: Globe },
  { title: 'Campaigns', url: '/campaigns', icon: Map },
];

export function RulesetSidebar() {
  const { activeRuleset } = useActiveRuleset();
  const { open } = useSidebar();
  const location = useLocation();

  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/worlds' ||
    location.pathname === '/campaigns';

  const items = isHomepage
    ? HOMEPAGE_ITEMS
    : [
        { title: 'Attributes', url: `/rulesets/${activeRuleset?.id}/attributes`, icon: UserRoundPen },
        { title: 'Actions', url: `/rulesets/${activeRuleset?.id}/actions`, icon: HandFist },
        { title: 'Items', url: `/rulesets/${activeRuleset?.id}/items`, icon: Sword },
        { title: 'Charts', url: `/rulesets/${activeRuleset?.id}/charts`, icon: FileSpreadsheet },
        { title: 'Documents', url: `/rulesets/${activeRuleset?.id}/documents`, icon: Newspaper },
        { title: 'Windows', url: `/rulesets/${activeRuleset?.id}/windows`, icon: AppWindow },
        { title: 'Pages', url: `/rulesets/${activeRuleset?.id}/pages`, icon: LayoutTemplate },
        { title: 'Archetypes', url: `/rulesets/${activeRuleset?.id}/archetypes`, icon: User },
        { title: 'Scripts', url: `/rulesets/${activeRuleset?.id}/scripts`, icon: FileCode },
      ];

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
