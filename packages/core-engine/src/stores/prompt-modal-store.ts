import { create } from 'zustand';

export type PromptModalState = {
  open: boolean;
  multiple: boolean;
  input: boolean;
  msg: string;
  choices: string[];
  /** Resolve the promise returned by show() / showInput() with the selected choice or entered string. */
  _resolve: ((value: string | null) => void) | undefined;
  /** Resolve the promise returned by showMultiple() with the selected choices. */
  _resolveMultiple: ((value: string[] | null) => void) | undefined;
  /**
   * Show the prompt modal with message and choices. Returns a promise that resolves with the selected choice, or null if closed/canceled.
   * Used by QBScript prompt(msg, choices) when running in the worker (main thread handles PROMPT_REQUEST).
   */
  show: (msg: string, choices: string[]) => Promise<string | null>;
  /**
   * Show the prompt modal in multi-select mode. Resolves with the array of selected choices, or null if closed/canceled.
   * Used by QBScript promptMultiple(msg, choices).
   */
  showMultiple: (msg: string, choices: string[]) => Promise<string[] | null>;
  /**
   * Show the prompt modal with a text input and Submit button. Resolves with the entered string, or null if closed/canceled.
   * Used by QBScript promptInput(msg).
   */
  showInput: (msg: string) => Promise<string | null>;
  /** Call when the user selects a choice (single-select mode). Resolves the promise and closes the modal. */
  select: (choice: string) => void;
  /** Call when the user confirms their selection (multi-select mode). Resolves the promise and closes the modal. */
  confirm: (selectedChoices: string[]) => void;
  /** Call when the user submits the text input (input mode). Resolves the promise and closes the modal. */
  submitInput: (value: string) => void;
  /** Call on cancel/close without selection (resolves the pending promise with null). */
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

  show(msg: string, choices: string[]) {
    return new Promise<string | null>((resolve) => {
      set({
        open: true,
        multiple: false,
        input: false,
        msg,
        choices: [...choices],
        _resolve: resolve,
        _resolveMultiple: undefined,
      });
    });
  },

  showMultiple(msg: string, choices: string[]) {
    return new Promise<string[] | null>((resolve) => {
      set({
        open: true,
        multiple: true,
        input: false,
        msg,
        choices: [...choices],
        _resolve: undefined,
        _resolveMultiple: resolve,
      });
    });
  },

  showInput(msg: string) {
    return new Promise<string | null>((resolve) => {
      set({
        open: true,
        multiple: false,
        input: true,
        msg,
        choices: [],
        _resolve: resolve,
        _resolveMultiple: undefined,
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
    });
  },

  cancel() {
    const { _resolve, _resolveMultiple, multiple } = get();
    if (multiple) {
      _resolveMultiple?.(null);
    } else {
      _resolve?.(null);
    }
    set({
      open: false,
      multiple: false,
      input: false,
      msg: '',
      choices: [],
      _resolve: undefined,
      _resolveMultiple: undefined,
    });
  },
}));
