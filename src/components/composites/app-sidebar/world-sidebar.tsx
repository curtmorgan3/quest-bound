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
import { useWorld } from '@/lib/compass-api';
import { Globe, Layers } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

export function WorldSidebar() {
  const { open } = useSidebar();
  const { worldId } = useParams<{ worldId?: string }>();
  const location = useLocation();

  const world = useWorld(worldId);

  const isWorldsGlobeActive =
    location.pathname === '/worlds' || /^\/worlds\/[^/]+$/.test(location.pathname);

  const items = [
    { title: 'World', url: `/worlds/${worldId}`, icon: Globe },
    { title: 'Tilemaps', url: `/worlds/${worldId}/tilemaps`, icon: Layers },
  ];

  const title = world?.label ?? 'Quest Bound';

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
            const isActive =
              item.url === `/worlds/${worldId}`
                ? isWorldsGlobeActive
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
