import type { Component } from '@/types';
import { useRef } from 'react';
import { editorEmitter } from './editor-emitter';

export type ComponentsPositionChangeEvent = {
  components: Component[];
};

export type ComponentPositionChangeCallback = Map<string, Component>;

export const COMPONENTS_POSITION_CHANGE_EVENT = 'component-position-change';

type EventCallback = (updateMap: ComponentPositionChangeCallback) => void;

export const useSubscribeComponentPositionChanges = (callback: EventCallback) => {
  const subscribed = useRef<boolean>(false);

  if (!subscribed.current) {
    subscribed.current = true;
    editorEmitter.on(COMPONENTS_POSITION_CHANGE_EVENT, (details: ComponentsPositionChangeEvent) => {
      const { components } = details;
      const updateMap = new Map<string, Component>();

      components.forEach((component) => {
        updateMap.set(component.id, component);
      });

      callback(updateMap);
    });
  }
};
