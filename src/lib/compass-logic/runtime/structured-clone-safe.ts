/**
 * Interface for proxy objects that can be serialized for postMessage.
 * When the script worker sends SCRIPT_RESULT or CONSOLE_LOG, payloads are
 * structured-cloned; class instances and Proxies cannot be cloned. Proxies
 * implement toStructuredCloneSafe() so we convert them to plain objects at the boundary.
 */
export interface StructuredCloneSafe {
  toStructuredCloneSafe(): unknown;
}

function hasToStructuredCloneSafe(
  value: unknown,
): value is StructuredCloneSafe {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as StructuredCloneSafe).toStructuredCloneSafe === 'function'
  );
}

/**
 * Recursively prepare a value for structured cloning (postMessage).
 * Replaces proxy objects that implement toStructuredCloneSafe() with their
 * plain representation so the payload can be sent from the worker to the main thread.
 */
export function prepareForStructuredClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (hasToStructuredCloneSafe(value)) {
    return prepareForStructuredClone(
      value.toStructuredCloneSafe() as T,
    ) as T;
  }

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => prepareForStructuredClone(item)) as T;
  }

  if (typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      out[key] = prepareForStructuredClone((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }

  // Other objects (Date, RegExp, class instances without toStructuredCloneSafe, etc.)
  // Return as-is; postMessage may throw when cloning. Callers can extend this as needed.
  return value;
}
