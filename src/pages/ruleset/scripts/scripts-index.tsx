/**
 * Script library - list all scripts for the active ruleset, grouped by category
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { FileCode, Plus, Search } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useScriptFilters } from './use-script-filters';
import { CAMPAIGN_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS, typeFromParams } from './utils';

export function ScriptsIndex() {
  const { rulesetId: rulesetIdParam, campaignId } = useParams<{
    rulesetId?: string;
    campaignId?: string;
  }>();

  const [searchParams] = useSearchParams();
  const { rulesetId: rulesetIdFromHook } = useScripts();
  const rulesetId = rulesetIdParam ?? rulesetIdFromHook ?? '';
  const selectedType = typeFromParams(searchParams, 'campaigns');

  const { nameFilter, setNameFilter, setSelectedType, scriptsByCategory, filteredScripts } =
    useScriptFilters();

  const uncategorized = scriptsByCategory.filter((cat) => cat.category === 'Uncategorized');
  const categorized = scriptsByCategory.filter((cat) => cat.category !== 'Uncategorized');

  const options = campaignId ? CAMPAIGN_TYPE_OPTIONS : ENTITY_TYPE_OPTIONS;

  return (
    <div className='flex flex-col gap-6 p-4'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold'>Scripts</h1>
      </div>

      <div className='flex flex-wrap items-center gap-4'>
        <div className='relative flex-1 min-w-[200px] max-w-[280px]'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
          <Input
            id='script-name-filter'
            type='search'
            placeholder='Filter by name...'
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className='pl-9'
            aria-label='Filter scripts by name'
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label htmlFor='script-type-filter' className='text-sm'>
            Type
          </Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger id='script-type-filter' className='w-[140px]'>
              <SelectValue placeholder='All types' />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rulesetId && (
          <Button asChild>
            <Link
              to={
                campaignId
                  ? `/campaigns/${campaignId}/scripts/new`
                  : `/rulesets/${rulesetId}/scripts/new`
              }
              data-testid='scripts-new-script-link'>
              <Plus className='h-4 w-4 mr-2' />
              New Script
            </Link>
          </Button>
        )}
      </div>

      <div className='rounded-md border p-2'>
        {filteredScripts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <FileCode className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-sm font-medium'>No scripts yet</p>
            <p className='text-sm text-muted-foreground mb-4'>
              {selectedType !== 'all'
                ? `No scripts of type "${ENTITY_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label}".`
                : 'Create a script to get started.'}
            </p>
            {selectedType === 'all' && rulesetId && (
              <Button asChild>
                <Link
                  to={
                    campaignId
                      ? `/campaigns/${campaignId}/scripts/new`
                      : `/rulesets/${rulesetId}/scripts/new`
                  }
                  data-testid='scripts-new-script-link'>
                  <Plus className='h-4 w-4 mr-2' />
                  New Script
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {categorized.length > 0 && (
              <Accordion type='multiple' className='w-full border-b'>
                {categorized.map(({ category, scripts: categoryScripts }) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger style={{ textDecoration: 'none' }}>
                      {category}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className='list-none space-y-1 pl-1'>
                        {categoryScripts.map((script) => (
                          <li key={script.id}>
                            <Link
                              to={
                                campaignId
                                  ? `/campaigns/${campaignId}/scripts/${script.id}`
                                  : rulesetId
                                    ? `/rulesets/${rulesetId}/scripts/${script.id}`
                                    : '#'
                              }
                              className={
                                script.moduleId
                                  ? 'text-sm text-module-origin'
                                  : 'text-sm text-foreground'
                              }>
                              {script.name || 'Untitled'}.qbs
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            <div style={{ paddingTop: '4px', paddingBottom: '4px' }}>
              {uncategorized.map(({ scripts: categoryScripts }) => (
                <ul className='list-none space-y-1 pl-1' key='uncat'>
                  {categoryScripts.map((script) => (
                    <li key={script.id}>
                      <Link
                        to={
                          campaignId
                            ? `/campaigns/${campaignId}/scripts/${script.id}`
                            : rulesetId
                              ? `/rulesets/${rulesetId}/scripts/${script.id}`
                              : '#'
                        }
                        className={
                          script.moduleId ? 'text-sm text-module-origin' : 'text-sm text-foreground'
                        }>
                        {script.name || 'Untitled'}.qbs
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
