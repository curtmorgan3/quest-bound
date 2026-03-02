import { create } from 'zustand';

export type PromptModalState = {
  open: boolean;
  msg: string;
  choices: string[];
  /** Resolve the promise returned by show() with the selected choice. */
  _resolve: ((value: string) => void) | undefined;
  _reject: ((err: Error) => void) | undefined;
  /**
   * Show the prompt modal with message and choices. Returns a promise that resolves with the selected choice.
   * Used by QBScript prompt(msg, choices) when running in the worker (main thread handles PROMPT_REQUEST).
   */
  show: (msg: string, choices: string[]) => Promise<string>;
  /** Call when the user selects a choice. Resolves the promise and closes the modal. */
  select: (choice: string) => void;
  /** Call on cancel/close without selection (reject). */
  cancel: () => void;
};

export const usePromptModalStore = create<PromptModalState>()((set, get) => ({
  open: false,
  msg: '',
  choices: [],
  _resolve: undefined,
  _reject: undefined,

  show(msg: string, choices: string[]) {
    return new Promise<string>((resolve, reject) => {
      set({
        open: true,
        msg,
        choices: [...choices],
        _resolve: resolve,
        _reject: reject,
      });
    });
  },

  select(choice: string) {
    const { _resolve } = get();
    _resolve?.(choice);
    set({
      open: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _reject: undefined,
    });
  },

  cancel() {
    const { _reject } = get();
    _reject?.(new Error('Prompt cancelled'));
    set({
      open: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _reject: undefined,
    });
  },
}));
