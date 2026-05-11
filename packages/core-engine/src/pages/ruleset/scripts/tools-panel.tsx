import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ChevronLeft, ChevronRight, Layers, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';

type Tab = 'output' | 'context' | 'reference';

interface ToolsPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeTab: Tab;
  onActiveTabChange: (tab: Tab) => void;
  output: ReactNode;
  context: ReactNode;
  reference: ReactNode;
}

const TAB_ICONS: Record<Tab, typeof Terminal> = {
  output: Terminal,
  context: Layers,
  reference: BookOpen,
};

export function ToolsPanel({
  collapsed,
  onToggleCollapsed,
  activeTab,
  onActiveTabChange,
  output,
  context,
  reference,
}: ToolsPanelProps) {
  if (collapsed) {
    return (
      <aside className='w-12 shrink-0 border-l bg-muted/20 flex flex-col items-center py-3 gap-1'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onToggleCollapsed}
          title='Expand tools panel'
          aria-label='Expand tools panel'>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <div className='h-px bg-border w-3/5 my-1' />
        {(['output', 'context', 'reference'] as const).map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <Button
              key={t}
              variant='ghost'
              size='icon'
              onClick={() => {
                onActiveTabChange(t);
                onToggleCollapsed();
              }}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              aria-label={t}>
              <Icon className='h-4 w-4' />
            </Button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className='w-[360px] shrink-0 border-l bg-muted/20 flex flex-col min-h-0'>
      <Tabs
        value={activeTab}
        onValueChange={(v) => onActiveTabChange(v as Tab)}
        className='flex-1 flex flex-col min-h-0'>
        <div className='flex items-center border-b shrink-0'>
          <TabsList className='flex-1 h-auto bg-transparent p-0 rounded-none justify-start'>
            <TabsTrigger
              value='output'
              className='gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-xs uppercase tracking-wider px-3 py-2.5'>
              <Terminal className='h-3 w-3' />
              Output
            </TabsTrigger>
            <TabsTrigger
              value='context'
              className='gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-xs uppercase tracking-wider px-3 py-2.5'>
              <Layers className='h-3 w-3' />
              Context
            </TabsTrigger>
            <TabsTrigger
              value='reference'
              className='gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-xs uppercase tracking-wider px-3 py-2.5'>
              <BookOpen className='h-3 w-3' />
              Reference
            </TabsTrigger>
          </TabsList>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 mr-1 shrink-0'
            onClick={onToggleCollapsed}
            title='Collapse tools panel'
            aria-label='Collapse tools panel'>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
        <TabsContent value='output' className='flex-1 min-h-0 mt-0 overflow-hidden'>
          {output}
        </TabsContent>
        <TabsContent value='context' className='flex-1 min-h-0 mt-0 overflow-hidden'>
          {context}
        </TabsContent>
        <TabsContent value='reference' className='flex-1 min-h-0 mt-0 overflow-hidden'>
          {reference}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
