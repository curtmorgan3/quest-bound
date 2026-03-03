/**
 * Single place for auto-generated "event invoked" log messages.
 * Alter the message format here for action, item, and campaign event invocations.
 */

export type EventInvocationType = 'action' | 'item' | 'campaign_event';

export interface EventInvocationLogParams {
  ownerName: string;
  entityName: string;
  /** Event handler name, e.g. on_activate, on_consume, on_enter. */
  eventName: string;
  /** Target character names (e.g. from action target or selectCharacter(s)); omitted when empty. */
  targetNames?: string[];
}

/**
 * Build the log message when an action, item, or campaign event is invoked.
 * Used so the message template can be changed in one place.
 */
export function getEventInvocationLogMessage(
  type: EventInvocationType,
  params: EventInvocationLogParams,
): string {
  const { ownerName, entityName, eventName, targetNames } = params;
  const hasTargets = targetNames && targetNames.length > 0;
  const targetPart = hasTargets ? ` on ${targetNames.join(', ')}` : '';

  console.log(type);

  let verb = 'called';
  if (type === 'item') {
    switch (eventName) {
      case 'on_equip':
        verb = 'equipped';
        break;
      case 'on_unequip':
        verb = 'unequipped';
        break;
      case 'on_consume':
        verb = 'consumed';
        break;
      default:
        verb = 'used';
    }
  }

  return `${ownerName} ${verb} ${entityName}${targetPart}`;
}
