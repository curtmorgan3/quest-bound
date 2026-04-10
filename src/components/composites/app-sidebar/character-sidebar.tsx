import { Button } from '@/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCharacter, useCharts, useDocuments } from '@/lib/compass-api';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  db,
  useCloudAuthStore,
} from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Globe,
  Handbag,
  Home,
  Pin,
  PinOff,
  UserPlus,
} from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PlaytestRulesetControls } from '@/components/composites/playtest/playtest-ruleset-controls';
import { JoinCampaignPanel } from './join-campaign-panel';

export function CharacterSidebar() {
  const { character, updateCharacter } = useCharacter();
  const { documents } = useDocuments(character?.rulesetId);
  const { charts } = useCharts(character?.rulesetId);
  const { open } = useSidebar();
  const { documentId, chartId } = useParams<{ documentId?: string; chartId?: string }>();
  const location = useLocation();
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const isCloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const showJoinCampaignForCloud = cloudSyncEnabled && !isCloudSyncEligibilityLoading;
  const [joinCampaignOpen, setJoinCampaignOpen] = useState(false);
  const characterId = character?.id;
  const linkedToCampaignLive = useLiveQuery(async () => {
    if (!characterId) return false;
    const rows = await db.campaignCharacters.where('characterId').equals(characterId).toArray();
    return filterNotSoftDeleted(rows).length > 0;
  }, [characterId]);
  const isCharacterLinkedToCampaign = linkedToCampaignLive ?? false;

  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);
  const characterArchetypesPanel = useContext(CharacterArchetypesPanelContext);

  useEffect(() => {
    if (!showJoinCampaignForCloud) {
      setJoinCampaignOpen(false);
    }
  }, [showJoinCampaignForCloud]);

  if (!character) return null;

  const isViewingDocument = !!documentId;
  const isViewingChart = !!chartId && location.pathname.includes('/chart/');

  const pinnedDocIds = character.pinnedSidebarDocuments ?? [];
  const pinnedChartIds = character.pinnedSidebarCharts ?? [];
  const pinnedDocuments = pinnedDocIds
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as typeof documents;
  const pinnedCharts = pinnedChartIds
    .map((id) => charts.find((c) => c.id === id))
    .filter(Boolean) as typeof charts;
  const hasPinned = pinnedDocuments.length > 0 || pinnedCharts.length > 0;

  const pinDocument = (docId: string) => {
    const next = pinnedDocIds.includes(docId) ? pinnedDocIds : [...pinnedDocIds, docId];
    updateCharacter(character.id, { pinnedSidebarDocuments: next });
  };
  const unpinDocument = (docId: string) => {
    updateCharacter(character.id, {
      pinnedSidebarDocuments: pinnedDocIds.filter((id) => id !== docId),
    });
  };
  const pinChart = (chartId: string) => {
    const next = pinnedChartIds.includes(chartId) ? pinnedChartIds : [...pinnedChartIds, chartId];
    updateCharacter(character.id, { pinnedSidebarCharts: next });
  };
  const unpinChart = (chartId: string) => {
    updateCharacter(character.id, {
      pinnedSidebarCharts: pinnedChartIds.filter((id) => id !== chartId),
    });
  };

  const sortedDocuments = [...documents].sort((a, b) => a.title.localeCompare(b.title));
  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      {isAuthenticated && showJoinCampaignForCloud && (
        <JoinCampaignPanel
          open={joinCampaignOpen}
          onOpenChange={setJoinCampaignOpen}
          character={character}
        />
      )}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              className={
                location.pathname === `/landing/${character.rulesetId}` ? 'text-primary' : ''
              }>
              <SidebarMenuButton asChild>
                <Link to={`/landing/${character.rulesetId}`} data-testid='nav-home'>
                  <Home className='w-4 h-4' />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem
              className={
                location.pathname === `/characters/${character.id}/default` ? 'text-primary' : ''
              }>
              <SidebarMenuButton asChild>
                <Link
                  to={`/characters/${character.id}/default`}
                  data-testid='nav-default-character-sheet'>
                  <ClipboardList className='w-4 h-4' />
                  <span>Default sheet</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {(isViewingDocument || isViewingChart) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to={`/characters/${character.id}`} data-testid='nav-back-to-character'>
                    <ArrowLeft className='w-4 h-4' />
                    <span>Back to Character</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          {characterInventoryPanel && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => characterInventoryPanel.setOpen(true)}
                data-testid='nav-character-inventory'>
                <Handbag className='w-4 h-4' />
                <span>Inventory</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {characterArchetypesPanel && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => characterArchetypesPanel.setOpen(true)}
                data-testid='nav-character-archetypes'>
                <UserPlus className='w-4 h-4' />
                <span>Archetypes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {isAuthenticated && showJoinCampaignForCloud && (
            <SidebarMenuItem className={isCharacterLinkedToCampaign ? 'text-primary' : ''}>
              <SidebarMenuButton
                type='button'
                onClick={() => setJoinCampaignOpen(true)}
                data-testid='nav-join-campaign'>
                <Globe className='w-4 h-4' />
                <span>Join campaign</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <PlaytestRulesetControls rulesetId={character.rulesetId} />
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
                      to={`/characters/${character.id}/documents/${doc.id}`}
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
                      to={`/characters/${character.id}/chart/${chart.id}`}
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
                            to={`/characters/${character.id}/documents/${doc.id}`}
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
                            to={`/characters/${character.id}/chart/${chart.id}`}
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
