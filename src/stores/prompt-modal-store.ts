import { create } from 'zustand';

export type PromptModalState = {
  open: boolean;
  multiple: boolean;
  input: boolean;
  msg: string;
  choices: string[];
  /** Resolve the promise returned by show() with the selected choice. */
  _resolve: ((value: string) => void) | undefined;
  /** Resolve the promise returned by showMultiple() with the selected choices. */
  _resolveMultiple: ((value: string[]) => void) | undefined;
  _reject: ((err: Error) => void) | undefined;
  /**
   * Show the prompt modal with message and choices. Returns a promise that resolves with the selected choice.
   * Used by QBScript prompt(msg, choices) when running in the worker (main thread handles PROMPT_REQUEST).
   */
  show: (msg: string, choices: string[]) => Promise<string>;
  /**
   * Show the prompt modal in multi-select mode. Returns a promise that resolves with the array of selected choices.
   * Used by QBScript promptMultiple(msg, choices).
   */
  showMultiple: (msg: string, choices: string[]) => Promise<string[]>;
  /**
   * Show the prompt modal with a text input and Submit button. Returns a promise that resolves with the entered string.
   * Used by QBScript promptInput(msg).
   */
  showInput: (msg: string) => Promise<string>;
  /** Call when the user selects a choice (single-select mode). Resolves the promise and closes the modal. */
  select: (choice: string) => void;
  /** Call when the user confirms their selection (multi-select mode). Resolves the promise and closes the modal. */
  confirm: (selectedChoices: string[]) => void;
  /** Call when the user submits the text input (input mode). Resolves the promise and closes the modal. */
  submitInput: (value: string) => void;
  /** Call on cancel/close without selection (reject). */
  cancel: () => void;
};

export const usePromptModalStore = create<PromptModalState>()((set, get) => ({
  open: false,
  multiple: false,
  input: false,
  msg: '',
  choices: [],
  _resolve: undefined,
  _resolveMultiple: undefined,
  _reject: undefined,

  show(msg: string, choices: string[]) {
    return new Promise<string>((resolve, reject) => {
      set({
        open: true,
        multiple: false,
        input: false,
        msg,
        choices: [...choices],
        _resolve: resolve,
        _resolveMultiple: undefined,
        _reject: reject,
      });
    });
  },

  showMultiple(msg: string, choices: string[]) {
    return new Promise<string[]>((resolve, reject) => {
      set({
        open: true,
        multiple: true,
        input: false,
        msg,
        choices: [...choices],
        _resolve: undefined,
        _resolveMultiple: resolve,
        _reject: reject,
      });
    });
  },

  showInput(msg: string) {
    return new Promise<string>((resolve, reject) => {
      set({
        open: true,
        multiple: false,
        input: true,
        msg,
        choices: [],
        _resolve: resolve,
        _resolveMultiple: undefined,
        _reject: reject,
      });
    });
  },

  select(choice: string) {
    const { _resolve } = get();
    _resolve?.(choice);
    set({
      open: false,
      multiple: false,
      input: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _resolveMultiple: undefined,
      _reject: undefined,
    });
  },

  confirm(selectedChoices: string[]) {
    const { _resolveMultiple } = get();
    _resolveMultiple?.(selectedChoices);
    set({
      open: false,
      multiple: false,
      input: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _resolveMultiple: undefined,
      _reject: undefined,
    });
  },

  submitInput(value: string) {
    const { _resolve } = get();
    _resolve?.(value);
    set({
      open: false,
      multiple: false,
      input: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _resolveMultiple: undefined,
      _reject: undefined,
    });
  },

  cancel() {
    const { _reject } = get();
    _reject?.(new Error('Prompt cancelled'));
    set({
      open: false,
      multiple: false,
      input: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _resolveMultiple: undefined,
      _reject: undefined,
    });
  },
}));
