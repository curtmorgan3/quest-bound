import { debugLog } from '@/utils';
import { create } from 'zustand';

const { log } = debugLog('log-provider');

const MAX_EVENTS = 300;

export enum LogType {
  LOGIC = 'Logic',
  SIDE_EFFECT = 'Side Effect',
  CONTROLLED = 'Controlled',
  ACTION = 'Action',
  ERROR = 'Error',
  DICE = 'Dice Roll',
}

export type EventLog = {
  type: LogType;
  message: string;
  source?: string;
  id?: string;
};

type EventLogStore = {
  events: EventLog[];
  logPanelOpen: boolean;
  logEvent: (event: EventLog) => void;
  clearEvents: () => void;
  setLogPanelOpen: (open: boolean) => void;
};

/**
 * Adds events to the event log panel within sheets. Events are typically added from logic.
 */
export const useEventLog = create<EventLogStore>()((set) => ({
  events: [],
  logPanelOpen: false,
  setLogPanelOpen: (open) => set({ logPanelOpen: open }),
  clearEvents: () => set({ events: [] }),
  logEvent: (event: EventLog) => {
    set((state) => {
      const { events } = state;
      if (!!event.id && events.find((e) => e.id === event.id)) return { events };
      log(`\n[${event.type}][${event.source}] ${event.message}`);

      const slicedEvents = events.slice(0, MAX_EVENTS - 1);
      return { events: [event, ...slicedEvents] };
    });
  },
}));
