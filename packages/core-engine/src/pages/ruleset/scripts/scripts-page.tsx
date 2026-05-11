/**
 * Scripts page — single-page lightweight IDE.
 * File tree (left) | Code editor (center) | Tools panel (right).
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Checkbox,
} from '@/components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useActiveRuleset, useCampaign } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import {
  useExecuteActionEvent,
  useExecuteArchetypeEvent,
  useExecuteItemEvent,
  useReactiveScriptExecution,
} from '@/lib/compass-logic';
import { CodeMirrorEditor } from '@/pages/ruleset/scripts/editor';
import { colorPrimary } from '@/palette';
import { db } from '@/stores';
import type { Script, ScriptParameterDefinition } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, FileCode, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ContextTab } from './context-tab';
import { FileTree, UNCATEGORIZED } from './file-tree';
import { OutputTab } from './output-tab';
import { ReferenceTab } from './reference-tab';
import { SCRIPT_TEMPLATES } from './templates';
import { ToolsPanel } from './tools-panel';
import { useAutoSave } from './use-auto-save';
import { getAutocompletePreference, SCRIPT_EDITOR_AUTOCOMPLETE_KEY } from './utils';

type ToolsTab = 'output' | 'context' | 'reference';

export function ScriptsPage() {
  const navigate = useNavigate();
  const {
    rulesetId: rulesetIdParam,
    scriptId,
    campaignId,
  } = useParams<{
    rulesetId?: string;
    scriptId?: string;
    campaignId?: string;
  }>();

  const { activeRuleset, testCharacter } = useActiveRuleset();
  const campaign = useCampaign(campaignId);
  const { scripts, createScript, updateScript, deleteScript } = useScripts(campaignId);

  const effectiveRulesetId = activeRuleset?.id ?? rulesetIdParam ?? campaign?.rulesetId ?? '';
  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const [search] = useSearchParams();
  const paramType = (search.get('type') ?? null) as Script['entityType'] | null;
  const paramEntityId = search.get('entityId');
  const paramEntityName = search.get('entityName');

  const sanitizedParamName = paramEntityName
    ? paramEntityName.replace(/ /g, '_').toLowerCase()
    : '';

  // ---------- Test event hooks ----------
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

  const scriptExecutionHook = useReactiveScriptExecution();

  // ---------- Local editor state ----------
  const defaultEntityType: Script['entityType'] = 'gameManager';
  const [name, setName] = useState(sanitizedParamName);
  const [entityType, setEntityType] = useState<Script['entityType']>(paramType ?? defaultEntityType);
  const [entityId, setEntityId] = useState<string | null>(paramEntityId ?? null);
  const [category, setCategory] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState('');
  const [parameters, setParameters] = useState<ScriptParameterDefinition[]>([]);
  const [initializedFromScriptId, setInitializedFromScriptId] = useState<string | null>(null);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(getAutocompletePreference);

  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolsTab>('output');
  const [extraCategories, setExtraCategories] = useState<string[]>([]);

  const setAutocompleteEnabledWithStorage = useCallback((enabled: boolean) => {
    setAutocompleteEnabled(enabled);
    try {
      localStorage.setItem(SCRIPT_EDITOR_AUTOCOMPLETE_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const requiresEntityAssociation =
    entityType === 'attribute' ||
    entityType === 'action' ||
    entityType === 'item' ||
    entityType === 'archetype';
  const missingEntityAssociation = requiresEntityAssociation && !entityId;

  // Autosave (sourceCode, parameters, and metadata)
  const { validationErrors } = useAutoSave({
    sourceCode,
    script,
    parameters,
    name,
    entityType,
    entityId,
    category,
  });
  const hasErrors = validationErrors.length > 0;

  // Dependency graph (for AttributeControls)
  const dependencyGraphNode = useLiveQuery(
    () => (script?.id ? db.dependencyGraphNodes.where({ scriptId: script.id }).first() : undefined),
    [script?.id],
  );
  const scriptAttributeIds = dependencyGraphNode?.dependencies ?? [];

  // ---------- Sync from selected script -> local state (once per script id) ----------
  useEffect(() => {
    if (!script) return;
    if (initializedFromScriptId === script.id) return;
    setInitializedFromScriptId(script.id);
    setName(script.name);
    setEntityType(script.entityType);
    setEntityId(script.entityId);
    setSourceCode(script.sourceCode);
    setCategory(script.category ?? null);
    setParameters(script.parameters ?? []);
  }, [script, initializedFromScriptId]);

  // ---------- Auto-create script when route is /scripts/new ----------
  // Mirrors old behavior: support ?type=&entityId=&entityName= query params from
  // other pages linking to "new script for this <entity>".
  // The ref guards against re-firing: createScript's reference changes every
  // render (it's not memoized), so without this guard we'd loop and create
  // a new script on each re-render until the navigate replace finally lands.
  // We wait for activeRuleset to load before firing because createScript
  // internally requires activeRuleset.id and silently no-ops without it.
  const newScriptStartedRef = useRef(false);
  useEffect(() => {
    if (!isNew) {
      newScriptStartedRef.current = false;
      return;
    }
    if (!activeRuleset) return;
    if (newScriptStartedRef.current) return;
    newScriptStartedRef.current = true;

    void (async () => {
      const desiredType: Script['entityType'] = paramType ?? defaultEntityType;
      const baseTemplate = SCRIPT_TEMPLATES[desiredType];

      let body = baseTemplate;
      if (paramEntityId) {
        try {
          let description: string | undefined;
          if (desiredType === 'attribute')
            description = (await db.attributes.get(paramEntityId))?.description;
          else if (desiredType === 'action')
            description = (await db.actions.get(paramEntityId))?.description;
          else if (desiredType === 'item')
            description = (await db.items.get(paramEntityId))?.description;
          else if (desiredType === 'archetype')
            description = (await db.archetypes.get(paramEntityId))?.description;
          if (description?.trim()) {
            const sanitized = description.replace(/\*\//g, '*\\/');
            body = `/*\n${sanitized}\n*/\n\n${baseTemplate.trimStart()}`;
          }
        } catch {
          // ignore
        }
      }

      const id = await createScript({
        name: sanitizedParamName || 'Untitled',
        sourceCode: body,
        entityType: desiredType,
        entityId:
          desiredType === 'global' ||
          desiredType === 'characterLoader' ||
          desiredType === 'gameManager'
            ? null
            : (paramEntityId ?? null),
        isGlobal: desiredType === 'global',
        enabled: true,
        campaignId,
      });
      if (id) {
        navigate(
          `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? effectiveRulesetId}/scripts/${id}`,
          { replace: true },
        );
      }
    })();
  }, [
    isNew,
    activeRuleset,
    effectiveRulesetId,
    campaignId,
    paramType,
    paramEntityId,
    sanitizedParamName,
    createScript,
    navigate,
  ]);

  // ---------- Redirect /scripts to first script when none is selected ----------
  useEffect(() => {
    if (scriptId) return;
    if (!effectiveRulesetId) return;
    if (scripts.length === 0) return;
    const first = scripts[0];
    navigate(
      `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? effectiveRulesetId}/scripts/${first.id}`,
      { replace: true },
    );
  }, [scriptId, effectiveRulesetId, campaignId, scripts, navigate]);

  // ---------- Handlers ----------
  const handleSelect = (id: string) => {
    navigate(
      `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? effectiveRulesetId}/scripts/${id}`,
    );
  };

  const handleNewScript = useCallback(async () => {
    if (!effectiveRulesetId) return;
    const id = await createScript({
      name: 'Untitled',
      sourceCode: SCRIPT_TEMPLATES[defaultEntityType],
      entityType: defaultEntityType,
      entityId: null,
      isGlobal: false,
      enabled: true,
      campaignId,
    });
    if (id) {
      navigate(
        `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? effectiveRulesetId}/scripts/${id}`,
      );
    }
  }, [effectiveRulesetId, campaignId, createScript, navigate]);

  const handleNewCategory = useCallback(() => {
    const input = window.prompt('New category name');
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed || trimmed === UNCATEGORIZED) return;
    setExtraCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const handleMoveScript = useCallback(
    (id: string, newCategory: string | null) => {
      void updateScript(id, { category: newCategory ?? undefined });
      if (newCategory) {
        setExtraCategories((prev) => prev.filter((c) => c !== newCategory));
      }
      if (id === script?.id) {
        setCategory(newCategory);
      }
    },
    [updateScript, script?.id],
  );

  const handleDelete = async () => {
    if (!script) return;
    await deleteScript(script.id);
    const remaining = scripts.filter((s) => s.id !== script.id);
    if (remaining.length > 0) {
      handleSelect(remaining[0].id);
    } else {
      navigate(
        `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? effectiveRulesetId}/scripts`,
        { replace: true },
      );
    }
  };

  const handleRun = useCallback(async () => {
    if (!activeRuleset || !testCharacter) return;
    if (missingEntityAssociation) return;

    const paramsRecord =
      parameters && parameters.length
        ? Object.fromEntries(
            parameters
              .map((p) => ({ key: p.label.trim(), value: p.defaultValue ?? null }))
              .filter((p) => p.key.length > 0)
              .map((p) => [p.key, p.value]),
          )
        : undefined;

    await scriptExecutionHook.execute({
      rulesetId: activeRuleset.id,
      scriptId: script?.id ?? 'script-editor-run',
      sourceCode,
      characterId: testCharacter.id,
      triggerType: 'load',
      reactiveAttributeId: entityType === 'attribute' ? (entityId ?? undefined) : undefined,
      entityType,
      entityId: entityId ?? undefined,
      ...(paramsRecord ? { params: paramsRecord } : {}),
    });
  }, [
    activeRuleset,
    testCharacter,
    missingEntityAssociation,
    parameters,
    scriptExecutionHook,
    script?.id,
    sourceCode,
    entityType,
    entityId,
  ]);

  const handleClearLogs = useCallback(() => {
    scriptExecutionHook.reset();
    resetActionEvent();
    resetItemEvent();
    resetArchetypeEvent();
  }, [scriptExecutionHook, resetActionEvent, resetItemEvent, resetArchetypeEvent]);

  // Local cache to avoid prompt re-confirmation flicker
  const skipDeleteConfirm = useMemo(
    () => localStorage.getItem('qb.confirmOnDelete') === 'false',
    // re-eval every render is fine; this just reads localStorage once per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [script?.id],
  );

  const runDisabled =
    !activeRuleset || !testCharacter || missingEntityAssociation || hasErrors;

  return (
    <div className='flex flex-col h-full min-h-0'>
      {/* Top bar */}
      <div className='flex items-center gap-3 px-4 py-3 border-b shrink-0'>
        <h1 className='m-0 text-lg flex-1' style={{ fontFamily: 'CygniRoMonoPro' }}>
          <span style={{ color: colorPrimary }}>QB</span>
          <span>Script</span>
        </h1>
        {script && (
          <DeleteButton
            skipConfirm={skipDeleteConfirm}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Body: tree | editor | tools */}
      <div className='flex flex-1 min-h-0'>
        <FileTree
          scripts={scripts}
          activeId={script?.id ?? null}
          extraCategories={extraCategories}
          collapsed={treeCollapsed}
          onToggleCollapsed={() => setTreeCollapsed((c) => !c)}
          onSelect={handleSelect}
          onNewScript={handleNewScript}
          onNewCategory={handleNewCategory}
          onMoveScript={handleMoveScript}
        />

        <main className='flex-1 flex flex-col min-w-0 min-h-0 bg-background'>
          {script ? (
            <>
              <div className='flex-1 min-h-0'>
                <CodeMirrorEditor
                  key={script.id}
                  value={sourceCode}
                  onChange={setSourceCode}
                  height='100%'
                  readOnly={!activeRuleset || !testCharacter}
                  className='h-full'
                  autocomplete={autocompleteEnabled}
                />
              </div>

              {/* Alerts strip */}
              <div className='shrink-0 flex flex-col gap-2 px-4 py-3 border-t'>
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
                      Select an entity for this script type before running (attribute, action,
                      item, or archetype).
                    </AlertDescription>
                  </Alert>
                )}
                {activeRuleset && !testCharacter && (
                  <Alert className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
                    <AlertTitle className='text-yellow-800 dark:text-yellow-200'>
                      No test character
                    </AlertTitle>
                    <AlertDescription className='text-yellow-800 dark:text-yellow-200'>
                      Run is disabled. A test character is created automatically when you create
                      a ruleset; ensure one exists for this ruleset to run scripts.
                    </AlertDescription>
                  </Alert>
                )}
                <span
                  className='text-xs cursor-pointer italic text-muted-foreground'
                  onClick={() => setAutocompleteEnabledWithStorage(!autocompleteEnabled)}>
                  {autocompleteEnabled ? 'Autocomplete active' : 'Autocomplete inactive'}
                </span>
              </div>
            </>
          ) : (
            <EmptyState onNewScript={handleNewScript} />
          )}
        </main>

        <ToolsPanel
          collapsed={toolsCollapsed}
          onToggleCollapsed={() => setToolsCollapsed((c) => !c)}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          output={
            <OutputTab
              scriptExecutionHook={scriptExecutionHook}
              logMessages={consoleLogs}
              announceMessages={announcements}
              error={actionEventError ?? itemEventError ?? archetypeEventError}
              runDisabled={runDisabled || !script}
              onRun={handleRun}
              onClearLogs={handleClearLogs}
            />
          }
          context={
            script ? (
              <ContextTab
                rulesetId={effectiveRulesetId}
                campaignId={campaignId}
                name={name}
                setName={setName}
                entityType={entityType}
                setEntityType={setEntityType}
                entityId={entityId}
                setEntityId={setEntityId}
                parameters={parameters}
                setParameters={setParameters}
                scriptAttributeIds={scriptAttributeIds}
                executeActionEvent={executeActionEvent}
                executeItemEvent={executeItemEvent}
                executeArchetypeEvent={executeArchetypeEvent}
              />
            ) : (
              <div className='p-4 text-sm text-muted-foreground italic'>
                Select or create a script to edit its context.
              </div>
            )
          }
          reference={<ReferenceTab />}
        />
      </div>
    </div>
  );
}

function EmptyState({ onNewScript }: { onNewScript: () => void }) {
  return (
    <div className='flex-1 flex flex-col items-center justify-center gap-4 text-center p-8'>
      <FileCode className='h-12 w-12 text-muted-foreground' />
      <div>
        <p className='text-sm font-medium'>No scripts yet</p>
        <p className='text-sm text-muted-foreground mt-1'>
          Create a script to get started.
        </p>
      </div>
      <Button onClick={onNewScript} data-testid='scripts-new-script-link'>
        New Script
      </Button>
    </div>
  );
}

function DeleteButton({
  skipConfirm,
  onDelete,
}: {
  skipConfirm: boolean;
  onDelete: () => void;
}) {
  if (skipConfirm) {
    return (
      <Button
        variant='ghost'
        size='icon'
        onClick={onDelete}
        title='Delete script'
        aria-label='Delete script'
        className='text-destructive hover:text-destructive'>
        <Trash2 className='h-4 w-4' />
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          title='Delete script'
          aria-label='Delete script'
          className='text-destructive hover:text-destructive'>
          <Trash2 className='h-4 w-4' />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
          <AlertDialogDescription>Permanently delete this content?</AlertDialogDescription>
          <div className='flex gap-2'>
            <Label htmlFor='script-editor-do-not-ask-again'>Do not ask again</Label>
            <Checkbox
              id='script-editor-do-not-ask-again'
              onCheckedChange={(checked) =>
                localStorage.setItem('qb.confirmOnDelete', String(!checked))
              }
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
