import type { CharacterSelectModalDelegatedRoster } from '@/lib/campaign-play/realtime/build-delegated-character-select-roster';
import { create } from 'zustand';

export type CharacterSelectMode = 'single' | 'multi';

type CharacterSelectRequest = {
  mode: CharacterSelectMode;
  title?: string;
  description?: string;
  rulesetId: string;
  campaignId?: string;
  /** When set, list rows come from the host snapshot (delegated play) instead of local Dexie. */
  delegatedRoster?: CharacterSelectModalDelegatedRoster;
};

type CharacterSelectResolution = {
  characterIds: string[];
};

export type CharacterSelectModalState = {
  open: boolean;
  mode: CharacterSelectMode;
  title?: string;
  description?: string;
  rulesetId?: string;
  campaignId?: string;
  delegatedRoster?: CharacterSelectModalDelegatedRoster;
  /** Resolve the promise returned by show() with selected character ids (empty on cancel). */
  _resolve: ((value: CharacterSelectResolution) => void) | undefined;
  _reject: ((err: Error) => void) | undefined;
  _queue: Array<{
    request: CharacterSelectRequest;
    resolve: (value: CharacterSelectResolution) => void;
    reject: (err: Error) => void;
  }>;
  show: (request: CharacterSelectRequest) => Promise<CharacterSelectResolution>;
  select: (characterIds: string[]) => void;
  cancel: () => void;
};

export const useCharacterSelectModalStore = create<CharacterSelectModalState>()(
  (set, get) => ({
    open: false,
    mode: 'single',
    title: undefined,
    description: undefined,
    rulesetId: undefined,
    campaignId: undefined,
    delegatedRoster: undefined,
    _resolve: undefined,
    _reject: undefined,
    _queue: [],

    async show(request: CharacterSelectRequest): Promise<CharacterSelectResolution> {
      return new Promise<CharacterSelectResolution>((resolve, reject) => {
        const state = get();
        const entry = { request, resolve, reject };

        // If no modal is open, show immediately
        if (!state.open && !state._resolve) {
          set({
            open: true,
            mode: request.mode,
            title: request.title,
            description: request.description,
            rulesetId: request.rulesetId,
            campaignId: request.campaignId,
            delegatedRoster: request.delegatedRoster,
            _resolve: resolve,
            _reject: reject,
          });
        } else {
          // Otherwise queue the request
          set((s) => ({
            _queue: [...s._queue, entry],
          }));
        }
      });
    },

    select(characterIds: string[]) {
      const { _resolve } = get();
      _resolve?.({ characterIds });

      // Close current modal and process next in queue (if any)
      set((state) => {
        const next = state._queue[0];
        if (!next) {
          return {
            open: false,
            mode: state.mode,
            title: undefined,
            description: undefined,
            rulesetId: undefined,
            campaignId: undefined,
            delegatedRoster: undefined,
            _resolve: undefined,
            _reject: undefined,
            _queue: [],
          };
        }

        const [, ...rest] = state._queue;
        return {
          open: true,
          mode: next.request.mode,
          title: next.request.title,
          description: next.request.description,
          rulesetId: next.request.rulesetId,
          campaignId: next.request.campaignId,
          delegatedRoster: next.request.delegatedRoster,
          _resolve: next.resolve,
          _reject: next.reject,
          _queue: rest,
        };
      });
    },

    cancel() {
      const { _resolve } = get();
      // On cancel, resolve with empty selection (no error)
      _resolve?.({ characterIds: [] });

      set((state) => {
        const next = state._queue[0];
        if (!next) {
          return {
            open: false,
            mode: state.mode,
            title: undefined,
            description: undefined,
            rulesetId: undefined,
            campaignId: undefined,
            delegatedRoster: undefined,
            _resolve: undefined,
            _reject: undefined,
            _queue: [],
          };
        }

        const [, ...rest] = state._queue;
        return {
          open: true,
          mode: next.request.mode,
          title: next.request.title,
          description: next.request.description,
          rulesetId: next.request.rulesetId,
          campaignId: next.request.campaignId,
          delegatedRoster: next.request.delegatedRoster,
          _resolve: next.resolve,
          _reject: next.reject,
          _queue: rest,
        };
      });
    },
  }),
);

