import { describe, expect, it } from 'vitest';
import {
  createCampaignEventParamsHelper,
} from '@/lib/compass-logic/reactive/event-handler-executor';
import type {
  CampaignEvent,
  CampaignEventParamType,
  CampaignEventParamValue,
  CampaignEventParameterDefinition,
  CampaignEventScene,
} from '@/types';

describe('createCampaignEventParamsHelper', () => {
  const makeParam = (
    id: string,
    name: string,
    type: CampaignEventParamType,
    defaultValue?: CampaignEventParamValue,
  ): CampaignEventParameterDefinition => ({
    id,
    name,
    type,
    defaultValue,
  });

  it('resolves defaults when no scene overrides exist', () => {
    const event: CampaignEvent = {
      id: 'ev1',
      campaignId: 'c1',
      label: 'Test Event',
      createdAt: 'now',
      updatedAt: 'now',
      parameters: [
        makeParam('p1', 'Name', 'string', 'Alice'),
        makeParam('p2', 'Count', 'number', 3),
      ],
    };

    const helper = createCampaignEventParamsHelper(event, null);

    expect(helper.get('Name')).toBe('Alice');
    expect(helper.getNumber('Count')).toBe(3);
    expect(helper.has('Missing')).toBe(false);
  });

  it('prefers scene parameter values over defaults', () => {
    const event: CampaignEvent = {
      id: 'ev1',
      campaignId: 'c1',
      label: 'Test Event',
      createdAt: 'now',
      updatedAt: 'now',
      parameters: [
        makeParam('p1', 'Name', 'string', 'Alice'),
        makeParam('p2', 'Active', 'boolean', false),
      ],
    };

    const sceneLink: CampaignEventScene = {
      id: 'link1',
      campaignEventId: 'ev1',
      campaignSceneId: 'scene1',
      createdAt: 'now',
      updatedAt: 'now',
      parameterValues: {
        p1: 'Bob',
        p2: 'true',
      },
    };

    const helper = createCampaignEventParamsHelper(event, sceneLink);

    expect(helper.get('Name')).toBe('Bob');
    expect(helper.getString('Name')).toBe('Bob');
    expect(helper.getBoolean('Active')).toBe(true);
  });

  it('can read scene values keyed by parameter name', () => {
    const event: CampaignEvent = {
      id: 'ev1',
      campaignId: 'c1',
      label: 'Test Event',
      createdAt: 'now',
      updatedAt: 'now',
      parameters: [makeParam('p1', 'Threshold', 'number', 10)],
    };

    // Simulate parameterValues stored with "Threshold" as key instead of param id "p1"
    const sceneLink: CampaignEventScene = {
      id: 'link1',
      campaignEventId: 'ev1',
      campaignSceneId: 'scene1',
      createdAt: 'now',
      updatedAt: 'now',
      parameterValues: {
        Threshold: 25,
      },
    };

    const helper = createCampaignEventParamsHelper(event, sceneLink);

    expect(helper.getNumber('Threshold')).toBe(25);
  });

  it('looks up parameters case-insensitively by name', () => {
    const event: CampaignEvent = {
      id: 'ev1',
      campaignId: 'c1',
      label: 'Test Event',
      createdAt: 'now',
      updatedAt: 'now',
      parameters: [makeParam('p1', 'Enemy Name', 'string', 'Goblin')],
    };

    const helper = createCampaignEventParamsHelper(event, null);

    expect(helper.get('Enemy Name')).toBe('Goblin');
    expect(helper.get('enemy name')).toBe('Goblin');
    expect(helper.get('ENEMY NAME')).toBe('Goblin');
  });

  it('returns null for unknown parameters', () => {
    const event: CampaignEvent = {
      id: 'ev1',
      campaignId: 'c1',
      label: 'Test Event',
      createdAt: 'now',
      updatedAt: 'now',
      parameters: [],
    };

    const helper = createCampaignEventParamsHelper(event, null);

    expect(helper.get('Unknown')).toBeNull();
    expect(helper.getNumber('Unknown')).toBeNull();
    expect(helper.getBoolean('Unknown')).toBeNull();
  });
});

