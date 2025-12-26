import type { Component } from '@/types';

export type EditorState = Map<string, Component>;

export type EditorConfiguration = {
  backgroundColor?: string;
};

export type ComponentType = 'shape' | 'text';
