import { Button } from '@/components/ui/button';
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
import { useCampaign, useCampaigns, useCharts, useDocuments } from '@/lib/compass-api';
import { FileSpreadsheet, FileText, Layers, Notebook, Pin, PinOff } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

export function CampaignSidebar() {
  const { open } = useSidebar();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const location = useLocation();
  const campaign = useCampaign(campaignId);
  const { updateCampaign } = useCampaigns();
  const { documents } = useDocuments(campaign?.rulesetId);
  const { charts } = useCharts(campaign?.rulesetId);

  const pinnedDocIds = campaign?.pinnedSidebarDocuments ?? [];
  const pinnedChartIds = campaign?.pinnedSidebarCharts ?? [];
  const pinnedDocuments = pinnedDocIds
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as typeof documents;
  const pinnedCharts = pinnedChartIds
    .map((id) => charts.find((c) => c.id === id))
    .filter(Boolean) as typeof charts;
  const hasPinned = pinnedDocuments.length > 0 || pinnedCharts.length > 0;

  const pinDocument = (docId: string) => {
    if (!campaign) return;
    const next = pinnedDocIds.includes(docId) ? pinnedDocIds : [...pinnedDocIds, docId];
    updateCampaign(campaign.id, { pinnedSidebarDocuments: next });
  };
  const unpinDocument = (docId: string) => {
    if (!campaign) return;
    updateCampaign(campaign.id, {
      pinnedSidebarDocuments: pinnedDocIds.filter((id) => id !== docId),
    });
  };
  const pinChart = (chartId: string) => {
    if (!campaign) return;
    const next = pinnedChartIds.includes(chartId) ? pinnedChartIds : [...pinnedChartIds, chartId];
    updateCampaign(campaign.id, { pinnedSidebarCharts: next });
  };
  const unpinChart = (chartId: string) => {
    if (!campaign) return;
    updateCampaign(campaign.id, {
      pinnedSidebarCharts: pinnedChartIds.filter((id) => id !== chartId),
    });
  };

  const sortedDocuments = [...documents].sort((a, b) => a.title.localeCompare(b.title));
  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));

  const documentId = location.pathname.match(/\/documents\/([^/]+)/)?.[1];
  const chartId = location.pathname.match(/\/chart\/([^/]+)/)?.[1];

  if (!campaign) return null;

  return (
    <>
      <SidebarGroup>
        <div className='flex items-center justify-left'>
          <SidebarGroupLabel>{campaign.label ?? 'Campaign'}</SidebarGroupLabel>
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
            <SidebarMenuItem
              className={
                location.pathname === `/campaigns/${campaign.id}/scenes` ? 'text-primary' : ''
              }>
              <SidebarMenuButton asChild>
                <Link to={`/campaigns/${campaign.id}/scenes`} data-testid='nav-scenes'>
                  <Layers className='w-4 h-4' />
                  <span>Scenes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem
              className={
                location.pathname === `/campaigns/${campaign.id}/documents` ||
                location.pathname.startsWith(`/campaigns/${campaign.id}/documents/`)
                  ? 'text-primary'
                  : ''
              }>
              <SidebarMenuButton asChild>
                <Link to={`/campaigns/${campaign.id}/documents`} data-testid='nav-documents'>
                  <Notebook className='w-4 h-4' />
                  <span>Notes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {hasPinned && (
        <SidebarGroup>
          <SidebarGroupLabel>Pinned</SidebarGroupLabel>
          <SidebarGroupContent className='max-h-[min(200px,40vh)] min-h-0 overflow-y-auto overflow-x-hidden'>
            <SidebarMenu>
              {pinnedDocuments.map((doc) => (
                <SidebarMenuItem
                  key={doc.id}
                  className={`flex items-center gap-0 w-full ${documentId === doc.id ? 'text-primary' : ''}`}>
                  <SidebarMenuButton asChild className='flex-1 min-w-0 justify-start'>
                    <Link
                      to={`/campaigns/${campaign.id}/documents/${doc.id}`}
                      data-testid={`nav-pinned-document-${doc.id}`}>
                      {doc.image ? (
                        <img
                          src={doc.image}
                          alt={doc.title}
                          className='w-4 h-4 rounded-sm object-cover shrink-0'
                        />
                      ) : (
                        <FileText className='w-4 h-4 shrink-0' />
                      )}
                      <span className='truncate text-muted-foreground'>{doc.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {open && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='shrink-0 h-7 w-7 opacity-70 hover:opacity-100'
                      onClick={() => unpinDocument(doc.id)}
                      title='Unpin'>
                      <PinOff className='w-3.5 h-3.5' />
                    </Button>
                  )}
                </SidebarMenuItem>
              ))}
              {pinnedCharts.map((chart) => (
                <SidebarMenuItem
                  key={chart.id}
                  className={`flex items-center gap-0 w-full ${chartId === chart.id ? 'text-primary' : ''}`}>
                  <SidebarMenuButton asChild className='flex-1 min-w-0 justify-start'>
                    <Link
                      to={`/campaigns/${campaign.id}/chart/${chart.id}`}
                      data-testid={`nav-pinned-chart-${chart.id}`}>
                      <FileSpreadsheet className='w-4 h-4 shrink-0' />
                      <span className='truncate text-muted-foreground'>{chart.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {open && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='shrink-0 h-7 w-7 opacity-70 hover:opacity-100'
                      onClick={() => unpinChart(chart.id)}
                      title='Unpin'>
                      <PinOff className='w-3.5 h-3.5' />
                    </Button>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {open && (
        <>
          <SidebarGroup>
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <SidebarGroupContent className='max-h-[min(200px,40vh)] min-h-0 overflow-y-auto overflow-x-hidden'>
              <SidebarMenu>
                {sortedDocuments.length === 0 ? (
                  <SidebarMenuItem>
                    <span className='px-2 py-1.5 text-xs text-muted-foreground'>No documents</span>
                  </SidebarMenuItem>
                ) : (
                  sortedDocuments.map((doc) => {
                    const isPinned = pinnedDocIds.includes(doc.id);
                    return (
                      <SidebarMenuItem
                        key={doc.id}
                        className={`flex items-center gap-0 w-full ${documentId === doc.id ? 'text-primary' : ''}`}>
                        <SidebarMenuButton asChild className='flex-1 min-w-0 justify-start'>
                          <Link
                            to={`/campaigns/${campaign.id}/documents/${doc.id}`}
                            data-testid={`nav-document-${doc.id}`}>
                            {doc.image ? (
                              <img
                                src={doc.image}
                                alt={doc.title}
                                className='w-4 h-4 rounded-sm object-cover shrink-0'
                              />
                            ) : (
                              <FileText className='w-4 h-4 shrink-0' />
                            )}
                            <span className='truncate text-muted-foreground'>{doc.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='shrink-0 h-7 w-7 opacity-70 hover:opacity-100'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            isPinned ? unpinDocument(doc.id) : pinDocument(doc.id);
                          }}
                          title={isPinned ? 'Unpin' : 'Pin'}>
                          {isPinned ? (
                            <PinOff className='w-3.5 h-3.5' />
                          ) : (
                            <Pin className='w-3.5 h-3.5' />
                          )}
                        </Button>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Charts</SidebarGroupLabel>
            <SidebarGroupContent className='max-h-[min(200px,40vh)] min-h-0 overflow-y-auto overflow-x-hidden'>
              <SidebarMenu>
                {sortedCharts.length === 0 ? (
                  <SidebarMenuItem>
                    <span className='px-2 py-1.5 text-xs text-muted-foreground'>No charts</span>
                  </SidebarMenuItem>
                ) : (
                  sortedCharts.map((chart) => {
                    const isPinned = pinnedChartIds.includes(chart.id);
                    return (
                      <SidebarMenuItem
                        key={chart.id}
                        className={`flex items-center gap-0 w-full ${chartId === chart.id ? 'text-primary' : ''}`}>
                        <SidebarMenuButton asChild className='flex-1 min-w-0 justify-start'>
                          <Link
                            to={`/campaigns/${campaign.id}/chart/${chart.id}`}
                            data-testid={`nav-chart-${chart.id}`}>
                            <FileSpreadsheet className='w-4 h-4 shrink-0' />
                            <span className='truncate text-muted-foreground'>{chart.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='shrink-0 h-7 w-7 opacity-70 hover:opacity-100'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            isPinned ? unpinChart(chart.id) : pinChart(chart.id);
                          }}
                          title={isPinned ? 'Unpin' : 'Pin'}>
                          {isPinned ? (
                            <PinOff className='w-3.5 h-3.5' />
                          ) : (
                            <Pin className='w-3.5 h-3.5' />
                          )}
                        </Button>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </>
  );
}
