import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { mergeCharacterWindowComponents } from '@/lib/compass-planes/utils/merge-character-window-components';
import type { Character, Component } from '@/types';
import { describe, expect, it } from 'vitest';

describe('mergeCharacterWindowComponents', () => {
  const template: Component[] = [
    {
      id: 't1',
      rulesetId: 'r1',
      windowId: 'w1',
      type: ComponentTypes.TEXT,
      x: 0,
      y: 0,
      z: 1,
      height: 20,
      width: 100,
      rotation: 0,
      data: JSON.stringify({ referenceLabel: 'hp_label', value: 'HP' }),
      style: JSON.stringify({ opacity: 1 }),
      createdAt: 'a',
      updatedAt: 'a',
    },
  ];

  it('returns template only when no character', () => {
    const out = mergeCharacterWindowComponents(template, {}, null);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('t1');
  });

  it('hides template ids in sheetHiddenComponentIds', () => {
    const character = {
      sheetHiddenComponentIds: ['t1'],
    } as Character;
    const out = mergeCharacterWindowComponents(template, {}, character);
    expect(out).toHaveLength(0);
  });

  it('merges overlay after template', () => {
    const overlay: Component[] = [
      {
        id: 'o1',
        rulesetId: 'r1',
        windowId: 'w1',
        type: ComponentTypes.TEXT,
        x: 5,
        y: 5,
        z: 2,
        height: 20,
        width: 50,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: 'a',
        updatedAt: 'a',
      },
    ];
    const out = mergeCharacterWindowComponents(
      template,
      { scriptOverlayComponents: JSON.stringify(overlay) },
      null,
    );
    expect(out.map((c) => c.id)).toEqual(['t1', 'o1']);
  });

  it('applies layout and script data patches', () => {
    const character = {
      componentLayoutOverrides: { t1: { x: 99 } },
      componentScriptDataPatches: { t1: { value: 'Patched' } },
    } as unknown as Character;
    const out = mergeCharacterWindowComponents(template, {}, character);
    expect(out[0]!.x).toBe(99);
    const data = JSON.parse(out[0]!.data);
    expect(data.value).toBe('Patched');
  });

  it('applies componentAttributeIdOverrides for template components', () => {
    const character = {
      componentAttributeIdOverrides: { t1: 'attr-uuid' },
    } as unknown as Character;
    const out = mergeCharacterWindowComponents(template, {}, character);
    expect(out[0]!.attributeId).toBe('attr-uuid');
  });

  it('can clear template attribute binding with null override', () => {
    const withAttr = {
      ...template[0]!,
      attributeId: 'bound-id',
    };
    const character = {
      componentAttributeIdOverrides: { t1: null },
    } as unknown as Character;
    const out = mergeCharacterWindowComponents([withAttr], {}, character);
    expect(out[0]!.attributeId).toBeNull();
  });
});
