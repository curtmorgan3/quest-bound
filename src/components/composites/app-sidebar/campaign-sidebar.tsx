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
import { BookOpen, Globe, Map, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

/** Campaign nav only – no ruleset items when viewing a campaign. */
const CAMPAIGN_NAV_ITEMS = [
  { title: 'Rulesets', url: '/rulesets', icon: BookOpen },
  { title: 'Characters', url: '/characters', icon: Users },
  { title: 'Worlds', url: '/worlds', icon: Globe },
  { title: 'Campaigns', url: '/campaigns', icon: Map },
];

export function CampaignSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <SidebarGroup>
      <div className='flex items-center justify-left'>
        <SidebarGroupLabel>Campaigns</SidebarGroupLabel>
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
          {CAMPAIGN_NAV_ITEMS.map((item) => {
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
