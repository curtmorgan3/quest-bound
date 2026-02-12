import { describe, it, expect, vi } from 'vitest';
import { injectDefaultComponent } from '@/lib/compass-planes/utils/inject-defaults';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import type { Component } from '@/types';

describe('injectDefaultComponent', () => {
  it('should inject defaults for shape component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.SHAPE);
    expect(result?.x).toBe(100);
    expect(result?.y).toBe(200);
    expect(result?.z).toBe(1);
    expect(result?.height).toBe(60);
    expect(result?.width).toBe(60);
    expect(result?.rotation).toBe(0);
    expect(result?.data).toBeDefined();
    expect(result?.style).toBeDefined();
  });

  it('should inject defaults for text component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.TEXT,
      x: 50,
      y: 75,
      id: 'text-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.TEXT);
    expect(result?.x).toBe(50);
    expect(result?.y).toBe(75);
    expect(result?.data).toBeDefined();
    expect(result?.style).toBeDefined();
  });

  it('should inject defaults for image component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.IMAGE,
      x: 10,
      y: 10,
      id: 'image-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.IMAGE);
  });

  it('should inject defaults for input component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.INPUT,
      x: 10,
      y: 20,
      id: 'input-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.INPUT);
  });

  it('should inject defaults for checkbox component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.CHECKBOX,
      x: 30,
      y: 40,
      id: 'checkbox-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.CHECKBOX);
  });

  it('should inject defaults for content component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.CONTENT,
      x: 50,
      y: 60,
      id: 'content-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.CONTENT);
  });

  it('should inject defaults for inventory component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.INVENTORY,
      x: 70,
      y: 80,
      id: 'inventory-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.INVENTORY);
  });

  it('should inject defaults for graph component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.GRAPH,
      x: 90,
      y: 100,
      id: 'graph-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.GRAPH);
  });

  it('should inject defaults for frame component', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.FRAME,
      x: 110,
      y: 120,
      id: 'frame-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeDefined();
    expect(result?.type).toBe(ComponentTypes.FRAME);
  });

  it('should preserve provided values over defaults', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      z: 5,
      height: 150,
      width: 250,
      rotation: 45,
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result?.z).toBe(5);
    expect(result?.height).toBe(150);
    expect(result?.width).toBe(250);
    expect(result?.rotation).toBe(45);
  });

  it('should return undefined and log error if type is missing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const partialComponent: Partial<Component> = {
      x: 100,
      y: 200,
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Missing required field for component creation: type');

    consoleSpy.mockRestore();
  });

  it('should return undefined and log error if x is missing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      y: 200,
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Missing required field for component creation: x');

    consoleSpy.mockRestore();
  });

  it('should return undefined and log error if y is missing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Missing required field for component creation: y');

    consoleSpy.mockRestore();
  });

  it('should handle component with custom data', () => {
    const customData = JSON.stringify({ customField: 'customValue' });

    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      data: customData,
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result?.data).toBe(customData);
  });

  it('should handle component with custom style', () => {
    const customStyle = JSON.stringify({ backgroundColor: '#ff0000' });

    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      style: customStyle,
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result?.style).toBe(customStyle);
  });

  it('should handle component with optional fields', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      locked: true,
      selected: true,
      groupId: 'group-1',
      attributeId: 'attr-1',
      actionId: 'action-1',
      childWindowId: 'child-window-1',
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result?.locked).toBe(true);
    expect(result?.selected).toBe(true);
    expect(result?.groupId).toBe('group-1');
    expect(result?.attributeId).toBe('attr-1');
    expect(result?.actionId).toBe('action-1');
    expect(result?.childWindowId).toBe('child-window-1');
  });

  it('should handle null values for optional fields', () => {
    const partialComponent: Partial<Component> = {
      type: ComponentTypes.SHAPE,
      x: 100,
      y: 200,
      groupId: null,
      attributeId: null,
      id: 'shape-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = injectDefaultComponent(partialComponent);

    expect(result?.groupId).toBeNull();
    expect(result?.attributeId).toBeNull();
  });
});
