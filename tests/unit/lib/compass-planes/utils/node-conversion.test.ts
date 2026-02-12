import { describe, it, expect } from 'vitest';
import {
  convertComponentToNode,
  convertComponentsToNodes,
  getComponentData,
  updateComponentData,
  getComponentStyles,
} from '@/lib/compass-planes/utils/node-conversion';
import type { Component } from '@/types';

describe('convertComponentToNode', () => {
  it('should convert a component to a node', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 100,
      y: 200,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const node = convertComponentToNode(component);

    expect(node.id).toBe('comp-1');
    expect(node.position).toEqual({ x: 100, y: 200 });
    expect(node.type).toBe('shape');
    expect(node.zIndex).toBe(1);
    expect(node.data).toMatchObject({
      label: 'shape-comp-1',
      id: 'comp-1',
      type: 'shape',
    });
  });

  it('should include selected state in node', () => {
    const component: Component = {
      id: 'comp-2',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'text',
      x: 50,
      y: 75,
      z: 2,
      height: 30,
      width: 80,
      rotation: 0,
      data: '{}',
      style: '{}',
      selected: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const node = convertComponentToNode(component);

    expect(node.selected).toBe(true);
  });

  it('should handle component without selected state', () => {
    const component: Component = {
      id: 'comp-3',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'image',
      x: 0,
      y: 0,
      z: 0,
      height: 100,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const node = convertComponentToNode(component);

    expect(node.selected).toBeUndefined();
  });

  it('should preserve all component data in node data', () => {
    const component: Component = {
      id: 'comp-4',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'input',
      x: 10,
      y: 20,
      z: 3,
      height: 40,
      width: 120,
      rotation: 45,
      data: '{"value":"test"}',
      style: '{"color":"red"}',
      locked: true,
      groupId: 'group-1',
      attributeId: 'attr-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const node = convertComponentToNode(component);

    expect(node.data.locked).toBe(true);
    expect(node.data.groupId).toBe('group-1');
    expect(node.data.attributeId).toBe('attr-1');
    expect(node.data.rotation).toBe(45);
  });
});

describe('convertComponentsToNodes', () => {
  it('should convert an array of components to nodes', () => {
    const components: Component[] = [
      {
        id: 'comp-1',
        rulesetId: 'ruleset-1',
        windowId: 'window-1',
        type: 'shape',
        x: 100,
        y: 200,
        z: 1,
        height: 50,
        width: 100,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'comp-2',
        rulesetId: 'ruleset-1',
        windowId: 'window-1',
        type: 'text',
        x: 50,
        y: 75,
        z: 2,
        height: 30,
        width: 80,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const nodes = convertComponentsToNodes(components);

    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe('comp-1');
    expect(nodes[1].id).toBe('comp-2');
  });

  it('should return empty array for empty input', () => {
    const nodes = convertComponentsToNodes([]);
    expect(nodes).toEqual([]);
  });

  it('should maintain order of components', () => {
    const components: Component[] = [
      {
        id: 'comp-a',
        rulesetId: 'ruleset-1',
        windowId: 'window-1',
        type: 'shape',
        x: 0,
        y: 0,
        z: 1,
        height: 50,
        width: 50,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'comp-b',
        rulesetId: 'ruleset-1',
        windowId: 'window-1',
        type: 'text',
        x: 10,
        y: 10,
        z: 2,
        height: 30,
        width: 30,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'comp-c',
        rulesetId: 'ruleset-1',
        windowId: 'window-1',
        type: 'image',
        x: 20,
        y: 20,
        z: 3,
        height: 40,
        width: 40,
        rotation: 0,
        data: '{}',
        style: '{}',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const nodes = convertComponentsToNodes(components);

    expect(nodes[0].id).toBe('comp-a');
    expect(nodes[1].id).toBe('comp-b');
    expect(nodes[2].id).toBe('comp-c');
  });
});

describe('getComponentData', () => {
  it('should parse and return component data', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{"value":"test","count":42}',
      style: '{}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const data = getComponentData(component);

    expect(data).toEqual({ value: 'test', count: 42 });
  });

  it('should return empty object for empty data string', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const data = getComponentData(component);

    expect(data).toEqual({});
  });

  it('should handle nested data structures', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{"nested":{"key":"value"},"array":[1,2,3]}',
      style: '{}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const data = getComponentData(component);

    expect(data).toEqual({
      nested: { key: 'value' },
      array: [1, 2, 3],
    });
  });
});

describe('updateComponentData', () => {
  it('should merge update into existing data', () => {
    const data = '{"existing":"value","count":10}';
    const update = { count: 20, newKey: 'newValue' };

    const result = updateComponentData(data, update);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      existing: 'value',
      count: 20,
      newKey: 'newValue',
    });
  });

  it('should handle empty data string', () => {
    const data = '{}';
    const update = { key: 'value' };

    const result = updateComponentData(data, update);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({ key: 'value' });
  });

  it('should handle empty update', () => {
    const data = '{"existing":"value"}';
    const update = {};

    const result = updateComponentData(data, update);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({ existing: 'value' });
  });

  it('should overwrite existing keys', () => {
    const data = '{"key1":"old","key2":"unchanged"}';
    const update = { key1: 'new' };

    const result = updateComponentData(data, update);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      key1: 'new',
      key2: 'unchanged',
    });
  });

  it('should handle nested updates', () => {
    const data = '{"level1":{"level2":"value"}}';
    const update = { newLevel: { nested: 'data' } };

    const result = updateComponentData(data, update);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({
      level1: { level2: 'value' },
      newLevel: { nested: 'data' },
    });
  });
});

describe('getComponentStyles', () => {
  it('should parse and format component styles', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{"outlineWidth":2,"outlineColor":"#ff0000","borderRadiusTopLeft":5,"borderRadiusTopRight":10,"borderRadiusBottomRight":15,"borderRadiusBottomLeft":20}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const styles = getComponentStyles(component);

    expect(styles.outline).toBe('2px solid #ff0000');
    expect(styles.borderRadius).toBe('5px 10px 15px 20px');
  });

  it('should set outline to undefined when outlineWidth is 0', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{"outlineWidth":0,"outlineColor":"#ff0000","borderRadiusTopLeft":0,"borderRadiusTopRight":0,"borderRadiusBottomRight":0,"borderRadiusBottomLeft":0}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const styles = getComponentStyles(component);

    expect(styles.outline).toBeUndefined();
    expect(styles.borderRadius).toBe('0px 0px 0px 0px');
  });

  it('should handle uniform border radius', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{"outlineWidth":1,"outlineColor":"#000000","borderRadiusTopLeft":10,"borderRadiusTopRight":10,"borderRadiusBottomRight":10,"borderRadiusBottomLeft":10}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const styles = getComponentStyles(component);

    expect(styles.borderRadius).toBe('10px 10px 10px 10px');
  });

  it('should handle different outline colors', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{"outlineWidth":3,"outlineColor":"rgba(0,0,0,0.5)","borderRadiusTopLeft":0,"borderRadiusTopRight":0,"borderRadiusBottomRight":0,"borderRadiusBottomLeft":0}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const styles = getComponentStyles(component);

    expect(styles.outline).toBe('3px solid rgba(0,0,0,0.5)');
  });

  it('should preserve other style properties', () => {
    const component: Component = {
      id: 'comp-1',
      rulesetId: 'ruleset-1',
      windowId: 'window-1',
      type: 'shape',
      x: 0,
      y: 0,
      z: 1,
      height: 50,
      width: 100,
      rotation: 0,
      data: '{}',
      style: '{"outlineWidth":1,"outlineColor":"#000","borderRadiusTopLeft":5,"borderRadiusTopRight":5,"borderRadiusBottomRight":5,"borderRadiusBottomLeft":5,"backgroundColor":"#ffffff","fontSize":16}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const styles = getComponentStyles(component);

    expect(styles.backgroundColor).toBe('#ffffff');
    expect(styles.fontSize).toBe(16);
  });
});
