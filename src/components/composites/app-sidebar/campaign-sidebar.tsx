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
import { FileCode, Map } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

export function CampaignSidebar() {
  const { open } = useSidebar();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const location = useLocation();

  const isCampaignActive =
    location.pathname === '/campaigns' || /^\/campaigns\/[^/]+$/.test(location.pathname);

  const items = [
    { title: 'Campaign', url: `/campaigns/${campaignId}`, icon: Map },
    { title: 'Scripts', url: `/campaigns/${campaignId}/scripts`, icon: FileCode },
  ];

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
          {items.map((item) => {
            const isActive =
              item.url === `/campaigns/${campaignId}`
                ? isCampaignActive
                : location.pathname.includes(item.title.toLowerCase());
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
