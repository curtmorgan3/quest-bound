import { describe, expect, it } from 'vitest';
import { createCampaignEventParamsHelper } from '@/lib/compass-logic/reactive/event-handler-executor';
import type {
  CampaignEvent,
  CampaignEventParamValue,
  Script,
  ScriptParameterDefinition,
  ScriptParamType,
} from '@/types';

describe('createCampaignEventParamsHelper', () => {
  const makeParam = (
    id: string,
    label: string,
    type: ScriptParamType,
    defaultValue?: CampaignEventParamValue,
  ): ScriptParameterDefinition => ({
    id,
    label,
    type,
    defaultValue,
  });

  const makeScript = (parameters: ScriptParameterDefinition[]): Script => ({
    id: 's1',
    rulesetId: 'r1',
    name: 'test',
    sourceCode: '',
    entityType: 'gameManager',
    entityId: null,
    isGlobal: false,
    enabled: true,
    parameters,
    createdAt: 'now',
    updatedAt: 'now',
  });

  const makeEvent = (overrides?: Record<string, CampaignEventParamValue>): CampaignEvent => ({
    id: 'ev1',
    campaignId: 'c1',
    sceneId: 'scene1',
    label: 'Test Event',
    scriptId: 's1',
    createdAt: 'now',
    updatedAt: 'now',
    ...(overrides ? { parameterValues: overrides } : {}),
  });

  it('resolves defaults when no event overrides exist', () => {
    const script = makeScript([
      makeParam('p1', 'Name', 'string', 'Alice'),
      makeParam('p2', 'Count', 'number', 3),
    ]);
    const event = makeEvent();

    const helper = createCampaignEventParamsHelper(script, event);

    expect(helper.get('Name')).toBe('Alice');
    expect(helper.get('Count')).toBe(3);
    expect(helper.get('Missing')).toBeNull();
  });

  it('prefers event parameter values over defaults', () => {
    const script = makeScript([
      makeParam('p1', 'Name', 'string', 'Alice'),
      makeParam('p2', 'Active', 'boolean', false),
    ]);
    const event = makeEvent({
      p1: 'Bob',
      p2: 'true',
    });

    const helper = createCampaignEventParamsHelper(script, event);

    expect(helper.get('Name')).toBe('Bob');
    expect(helper.get('Active')).toBe(true);
  });

  it('looks up parameters case-insensitively by label', () => {
    const script = makeScript([makeParam('p1', 'Enemy Name', 'string', 'Goblin')]);
    const event = makeEvent();

    const helper = createCampaignEventParamsHelper(script, event);

    expect(helper.get('Enemy Name')).toBe('Goblin');
    expect(helper.get('enemy name')).toBe('Goblin');
    expect(helper.get('ENEMY NAME')).toBe('Goblin');
  });

  it('returns null for unknown parameters', () => {
    const script = makeScript([]);
    const event = makeEvent();

    const helper = createCampaignEventParamsHelper(script, event);

    expect(helper.get('Unknown')).toBeNull();
  });
});

