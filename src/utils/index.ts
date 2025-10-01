import { v4 } from 'uuid';

const debugStyle =
  'background-color: #1d8d9eff; color: white; font-weight: bold; padding: 4px 8px; border-radius: 3px;';

const warnStyle =
  'background-color: #c09a12ff; color: black; font-weight: bold; padding: 4px 8px; border-radius: 3px;';

/**
 * Returns functions to log, warn or error in the console.
 *
 * Warns and errors will always print.
 *
 * Hide logs by setting a local storage variable `debug.log.<label.toLowerCase()>` to 'true'.
 *
 * Hide all logs by setting a local storage variable `debug.log.all` to 'true'.
 *
 * Hide logs for a specific label by setting a local storage variable `debug.log.<label.toLowerCase()>` to 'false'.
 */
export function debugLog(label: string, subLabel?: string) {
  const print = (type: 'log' | 'warn' | 'error') => {
    const debugAll = localStorage.getItem('debug.log.all') === 'true';

    const ignoreDebugScoped = subLabel
      ? localStorage.getItem(`debug.log.${label.toLowerCase()}.${subLabel.toLowerCase()}`) ===
        'false'
      : localStorage.getItem(`debug.log.${label.toLowerCase()}`) === 'false';

    const debugScoped = subLabel
      ? localStorage.getItem(`debug.log.${label.toLowerCase()}.${subLabel.toLowerCase()}`) ===
        'true'
      : localStorage.getItem(`debug.log.${label.toLowerCase()}`) === 'true';

    const msg = subLabel ? `[${label}][${subLabel}]: ` : `[${label}]: `;

    switch (type) {
      case 'log':
        return (...args: any[]) => {
          // Only hide messages for logs
          if ((debugAll && !ignoreDebugScoped) || (!debugAll && debugScoped)) {
            console.debug(`%c${msg}`, debugStyle, ...args);
          }
        };
      case 'warn':
        return (...args: any[]) => console.warn(`%c${msg}`, warnStyle, ...args);
      case 'error':
        return (...args: any[]) => console.error(msg, ...args);
    }
  };

  return {
    log: print('log'),
    warn: print('warn'),
    error: print('error'),
  };
}

/**
 * Returns a unique UUID with option context string attached
 */
export function generateId(context?: string): string {
  const id = v4();
  return context ? `${context}-${id}` : id;
}
