import { useEffect } from 'react';

interface UseKeyListenerProps {
  disabled?: boolean;
  onBackspace?: () => void;
  onDelete?: () => void;
  onKeyDown?: (args: UtilKeyEvent) => void;
  onKeyUp?: (args: UtilKeyEvent) => void;
  blockPropagation?: boolean;
}

export type UtilKeyEvent = {
  key: string;
  meta?: boolean;
  control?: boolean;
  shift?: boolean;
};

export const useKeyListeners = ({
  disabled,
  blockPropagation,
  onBackspace,
  onDelete,
  onKeyDown,
  onKeyUp,
}: UseKeyListenerProps) => {
  useEffect(() => {
    const keyListener = (e: KeyboardEvent) => {
      if (blockPropagation && !disabled) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (e.key === 'Backspace' && !disabled) onBackspace?.();
      if (e.key === 'Delete' && !disabled) onDelete?.();

      if (!disabled) {
        onKeyDown?.({ key: e.key, meta: e.metaKey, shift: e.shiftKey, control: e.ctrlKey });
      }
    };

    const keyUpListener = (e: KeyboardEvent) => {
      if (blockPropagation && !disabled) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (!disabled) {
        onKeyUp?.({ key: e.key, meta: e.metaKey, shift: e.shiftKey, control: e.ctrlKey });
      }
    };

    document.addEventListener('keydown', keyListener);
    document.addEventListener('keyup', keyUpListener);

    return () => {
      document.removeEventListener('keydown', keyListener);
      document.removeEventListener('keyup', keyUpListener);
    };
  }, [onBackspace, disabled, blockPropagation, onKeyDown, onKeyUp]);
};
