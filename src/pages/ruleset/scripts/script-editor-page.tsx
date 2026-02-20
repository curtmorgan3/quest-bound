import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRulesets } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { useWorld } from '@/lib/compass-api/hooks/worlds/use-world';
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
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AttributeControls } from './script-editor/attribute-controls';
import { EditorConsole } from './script-editor/editor-console';
import { EditorTopBar } from './script-editor/editor-top-bar';
import { EventControls } from './script-editor/event-controls';
import { SCRIPT_TEMPLATES } from './templates';
import { useAutoSave } from './use-auto-save';

const SCRIPT_EDITOR_AUTOCOMPLETE_KEY = 'quest-bound/script-editor/autocomplete';

function getAutocompletePreference(): boolean {
  try {
    const stored = localStorage.getItem(SCRIPT_EDITOR_AUTOCOMPLETE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function ScriptEditorPage() {
  const {
    rulesetId: rulesetIdParam,
    scriptId,
    worldId,
  } = useParams<{
    rulesetId?: string;
    scriptId: string;
    worldId?: string;
  }>();
  const world = useWorld(worldId);
  const effectiveRulesetId = rulesetIdParam ?? world?.rulesetId ?? '';
  const { scripts } = useScripts(worldId);
  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const { activeRuleset, testCharacter } = useRulesets();
  const {
    executeActionEvent,
    logMessages: actionEventLogs,
    announceMessages: actionEventAnnouncements,
    error: actionEventError,
  } = useExecuteActionEvent();
  const {
    executeItemEvent,
    logMessages: itemEventLogs,
    announceMessages: itemEventAnnouncements,
    error: itemEventError,
  } = useExecuteItemEvent();
  const {
    executeArchetypeEvent,
    logMessages: archetypeEventLogs,
    announceMessages: archetypeEventAnnouncements,
    error: archetypeEventError,
  } = useExecuteArchetypeEvent();

  const consoleLogs = [...actionEventLogs, ...itemEventLogs, ...archetypeEventLogs];
  const announcements = [
    ...actionEventAnnouncements,
    ...itemEventAnnouncements,
    ...archetypeEventAnnouncements,
  ];

  const defaultEntityType = worldId ? 'location' : 'attribute';

  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<Script['entityType']>(defaultEntityType);
  const [category, setCategory] = useState<string | null>(null);

  const [entityId, setEntityId] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState('');
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(getAutocompletePreference);

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
        worldId={worldId}
        sourceCode={sourceCode}
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
          <div className='flex gap-2'>
            <CodeMirrorEditor
              key={scriptId ?? 'new'}
              value={sourceCode}
              onChange={setSourceCode}
              height='320px'
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

        {/* Editor + panels */}
        <div className='flex-1 flex flex-col min-h-0 p-4 gap-4'>
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

          <EditorConsole
            scriptExecutionHook={workerHook}
            logMessages={consoleLogs}
            announceMessages={announcements}
            error={actionEventError ?? itemEventError ?? archetypeEventError}
          />
        </div>
      </div>
    </div>
  );
}
