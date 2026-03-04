import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useActiveRuleset, useCampaign } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import {
  useExecuteActionEvent,
  useExecuteArchetypeEvent,
  useExecuteItemEvent,
  useReactiveScriptExecution,
} from '@/lib/compass-logic';
import { CodeMirrorEditor } from '@/lib/compass-logic/editor';
import { colorPrimary } from '@/palette';
import { db } from '@/stores';
import type { Script } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AttributeControls } from './script-editor/attribute-controls';
import { EditorConsole } from './script-editor/editor-console';
import { EditorTopBar } from './script-editor/editor-top-bar';
import { EventControls } from './script-editor/event-controls';
import { SCRIPT_TEMPLATES } from './templates';
import { useAutoSave } from './use-auto-save';
import { getAutocompletePreference, SCRIPT_EDITOR_AUTOCOMPLETE_KEY } from './utils';

export function ScriptEditorPage() {
  const {
    rulesetId: rulesetIdParam,
    scriptId,
    campaignId,
  } = useParams<{
    rulesetId?: string;
    scriptId: string;
    campaignId?: string;
  }>();

  const campaign = useCampaign(campaignId);

  const effectiveRulesetId = rulesetIdParam ?? campaign?.rulesetId ?? '';

  const { scripts } = useScripts(campaignId);
  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const [search] = useSearchParams();
  const type = (search.get('type') ?? null) as Script['entityType'] | null;
  const paramEntityId = search.get('entityId');
  const paramEntityName = search.get('entityName');

  const entityName = paramEntityName ? paramEntityName.replace(/ /g, '_').toLowerCase() : '';

  const { activeRuleset, testCharacter } = useActiveRuleset();
  const {
    executeActionEvent,
    logMessages: actionEventLogs,
    announceMessages: actionEventAnnouncements,
    error: actionEventError,
    reset: resetActionEvent,
  } = useExecuteActionEvent();
  const {
    executeItemEvent,
    logMessages: itemEventLogs,
    announceMessages: itemEventAnnouncements,
    error: itemEventError,
    reset: resetItemEvent,
  } = useExecuteItemEvent();
  const {
    executeArchetypeEvent,
    logMessages: archetypeEventLogs,
    announceMessages: archetypeEventAnnouncements,
    error: archetypeEventError,
    reset: resetArchetypeEvent,
  } = useExecuteArchetypeEvent();

  const consoleLogs = [...actionEventLogs, ...itemEventLogs, ...archetypeEventLogs];
  const announcements = [
    ...actionEventAnnouncements,
    ...itemEventAnnouncements,
    ...archetypeEventAnnouncements,
  ];

  const defaultEntityType = campaignId ? 'campaignEvent' : 'attribute';

  const [name, setName] = useState(entityName);
  const [entityType, setEntityType] = useState<Script['entityType']>(type ?? defaultEntityType);
  const [category, setCategory] = useState<string | null>(null);

  const [entityId, setEntityId] = useState<string | null>(paramEntityId ?? null);
  const [sourceCode, setSourceCode] = useState('');
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(getAutocompletePreference);
  const [consolePanelOpen, setConsolePanelOpen] = useState(false);

  const setAutocompleteEnabledWithStorage = useCallback((enabled: boolean) => {
    setAutocompleteEnabled(enabled);
    try {
      localStorage.setItem(SCRIPT_EDITOR_AUTOCOMPLETE_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const { validationErrors } = useAutoSave({
    sourceCode,
    script,
  });

  const hasErrors = validationErrors.length > 0;

  const workerHook = useReactiveScriptExecution();

  // Get attribute IDs from the dependency graph for this script
  const dependencyGraphNode = useLiveQuery(
    () =>
      scriptId && scriptId !== 'new'
        ? db.dependencyGraphNodes.where({ scriptId }).first()
        : undefined,
    [scriptId],
  );
  const scriptAttributeIds = dependencyGraphNode?.dependencies ?? [];

  const associatedAttributeId = entityType === 'attribute' ? entityId : null;

  const requiresEntityAssociation =
    entityType === 'attribute' ||
    entityType === 'action' ||
    entityType === 'item' ||
    entityType === 'archetype' ||
    entityType === 'campaignEvent';

  const missingEntityAssociation = requiresEntityAssociation && !entityId;

  // Sync script data to state when navigating to a different (existing) script
  useEffect(() => {
    if (script && !isNew) {
      setName(script.name);
      setEntityType(script.entityType);
      setEntityId(script.entityId);
      setSourceCode(script.sourceCode);
      setCategory(script.category ?? null);
    }
  }, [scriptId, script, isNew]);

  // When creating a new script, update source template when type changes
  useEffect(() => {
    if (isNew) {
      setSourceCode(SCRIPT_TEMPLATES[entityType]);
    }
  }, [isNew, entityType]);

  const usesEvents = entityType === 'action' || entityType === 'item' || entityType === 'archetype';

  return (
    <div className='flex flex-col h-full min-h-0'>
      <EditorTopBar
        rulesetId={effectiveRulesetId}
        campaignId={campaignId}
        sourceCode={sourceCode}
        saveDisabled={missingEntityAssociation}
        scriptExecutionHook={workerHook}
        {...{
          name,
          setName,
          entityId,
          setEntityId,
          entityType,
          setEntityType,
          category,
          setCategory,
        }}
      />

      <div className='flex-1 flex flex-col min-h-0 gap-4'>
        <div className='flex flex-col gap-2 flex-1 min-h-0 p-2'>
          <div className='flex items-center gap-4'>
            <div>
              <span style={{ fontSize: '18px', fontFamily: 'CygniRoMonoPro', color: colorPrimary }}>
                QB
              </span>
              <span style={{ fontSize: '18px', fontFamily: 'CygniRoMonoPro' }}>Script</span>
            </div>
          </div>
          <div className='flex gap-2 flex-1 min-h-0'>
            <CodeMirrorEditor
              key={scriptId ?? 'new'}
              value={sourceCode}
              onChange={setSourceCode}
              height='100%'
              readOnly={!activeRuleset || !testCharacter}
              className='flex-1 min-h-0 rounded-md border overflow-hidden'
              autocomplete={autocompleteEnabled}
            />

            {entityType === 'attribute' && (
              <AttributeControls
                scriptAttributeIds={scriptAttributeIds}
                associatedAttributeId={associatedAttributeId}
              />
            )}

            {usesEvents && (
              <EventControls
                entityType={entityType}
                entityId={entityId}
                executeActionEvent={executeActionEvent}
                executeItemEvent={executeItemEvent}
                executeArchetypeEvent={executeArchetypeEvent}
              />
            )}
          </div>
        </div>

        {/* Alerts and autocomplete */}
        <div className='shrink-0 flex flex-col p-4 gap-4'>
          {/* Validation */}
          {hasErrors && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Validation errors</AlertTitle>
              <AlertDescription>
                <ul className='list-disc list-inside text-sm mt-1'>
                  {validationErrors.map((e, i) => (
                    <li key={i}>
                      {e.line != null && e.column != null
                        ? `Line ${e.line}: ${e.message}`
                        : e.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {missingEntityAssociation && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Missing entity association</AlertTitle>
              <AlertDescription>
                Select an entity for this script type before saving (attribute, action, item,
                archetype, or campaign event).
              </AlertDescription>
            </Alert>
          )}

          {activeRuleset && !testCharacter && (
            <Alert className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
              <AlertTitle className='text-yellow-800 dark:text-yellow-200'>
                No test character
              </AlertTitle>
              <AlertDescription className='text-yellow-800 dark:text-yellow-200'>
                Run is disabled. A test character is created automatically when you create a
                ruleset; ensure one exists for this ruleset to run scripts.
              </AlertDescription>
            </Alert>
          )}

          <span
            className='text-xs cursor-pointer italic text-muted-foreground'
            onClick={() => setAutocompleteEnabledWithStorage(!autocompleteEnabled)}>
            {autocompleteEnabled ? 'Autocomplete active' : 'Autocomplete inactive'}
          </span>
        </div>
      </div>

      {/* Collapsible console / script errors panel */}
      <div className='shrink-0 flex flex-col border-t bg-background'>
        <button
          type='button'
          onClick={() => setConsolePanelOpen((o) => !o)}
          className='flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full text-left'>
          <Terminal className='h-4 w-4 shrink-0' />
          <span>Console & script errors</span>
          {consolePanelOpen ? (
            <ChevronDown className='h-4 w-4 shrink-0 ml-auto' />
          ) : (
            <ChevronUp className='h-4 w-4 shrink-0 ml-auto' />
          )}
        </button>
        <AnimatePresence initial={false}>
          {consolePanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 275, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
              className='overflow-hidden flex flex-col'>
              <div className='min-h-0 flex flex-col p-4 pt-0 flex-1'>
                <EditorConsole
                  scriptExecutionHook={workerHook}
                  logMessages={consoleLogs}
                  announceMessages={announcements}
                  error={actionEventError ?? itemEventError ?? archetypeEventError}
                  onClearLogs={() => {
                    workerHook.reset();
                    resetActionEvent();
                    resetItemEvent();
                    resetArchetypeEvent();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
