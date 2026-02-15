import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRulesets } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import {
  useExecuteActionEvent,
  useExecuteItemEvent,
  useReactiveScriptExecution,
} from '@/lib/compass-logic';
import { CodeMirrorEditor } from '@/lib/compass-logic/editor';
import { colorPrimary } from '@/palette';
import { db } from '@/stores';
import type { Script } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AttributeControls } from './script-editor/attribute-controls';
import { EditorConsole } from './script-editor/editor-console';
import { EditorTopBar } from './script-editor/editor-top-bar';
import { EventControls } from './script-editor/event-controls';
import { useAutoSave } from './use-auto-save';

export function ScriptEditorPage() {
  const { scriptId } = useParams<{ rulesetId: string; scriptId: string }>();
  const isNew = scriptId === 'new';
  const { scripts } = useScripts();
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

  const consoleLogs = [...actionEventLogs, ...itemEventLogs];
  const announcements = [...actionEventAnnouncements, ...itemEventAnnouncements];

  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<Script['entityType']>('attribute');

  const [entityId, setEntityId] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState('');

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

  // Initalize script data
  useEffect(() => {
    if (script && !isNew) {
      setName(script.name);
      setEntityType(script.entityType);
      setEntityId(script.entityId);
      setSourceCode(script.sourceCode);
    }
  }, [scriptId, script, isNew]);

  return (
    <div className='flex flex-col h-full min-h-0'>
      <EditorTopBar
        sourceCode={sourceCode}
        scriptExecutionHook={workerHook}
        {...{ name, setName, entityId, setEntityId, entityType, setEntityType }}
      />

      <div className='flex-1 flex flex-col min-h-0 gap-4'>
        <div className='flex flex-col gap-2 flex-1 min-h-0 p-2'>
          <div>
            <span style={{ fontSize: '18px', fontFamily: 'CygniRoMonoPro', color: colorPrimary }}>
              QB
            </span>
            <span style={{ fontSize: '18px', fontFamily: 'CygniRoMonoPro' }}>Script</span>
          </div>
          <div className='flex gap-2'>
            <CodeMirrorEditor
              key={scriptId ?? 'new'}
              value={sourceCode}
              onChange={setSourceCode}
              height='320px'
              readOnly={!activeRuleset || !testCharacter}
              className='flex-1 min-h-0 rounded-md border overflow-hidden'
            />

            {entityType === 'attribute' && (
              <AttributeControls
                scriptAttributeIds={scriptAttributeIds}
                associatedAttributeId={associatedAttributeId}
              />
            )}

            {entityType === 'action' ||
              (entityType === 'item' && (
                <EventControls
                  entityType={entityType}
                  entityId={entityId}
                  executeItemEvent={executeItemEvent}
                  executeActionEvent={executeActionEvent}
                />
              ))}
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

          <EditorConsole
            scriptExecutionHook={workerHook}
            logMessages={consoleLogs}
            announceMessages={announcements}
            error={actionEventError ?? itemEventError}
          />
        </div>
      </div>
    </div>
  );
}
