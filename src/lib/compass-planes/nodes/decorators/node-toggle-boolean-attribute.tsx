import { getComponentData, resolveEffectiveScriptId } from '@/lib/compass-planes/utils';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, type ReactNode } from 'react';

function coerceAttributeBoolean(value: string | number | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return Boolean(value);
}

/**
 * When `toggleBooleanAttributeId` is set on merged component data, click toggles that ruleset
 * boolean attribute on the active character. Yielded to effective click scripts the same way as
 * {@link NodeAttributeEditPanelControl}.
 */
export const NodeToggleBooleanAttribute = ({
  children,
  component,
}: {
  children: ReactNode;
  component: Component;
}) => {
  const characterContext = useContext(CharacterContext);
  const data = getComponentData(component);
  const toggleAttributeId = data.toggleBooleanAttributeId ?? null;
  const effectiveScriptId = resolveEffectiveScriptId(component, data);

  if (!toggleAttributeId || effectiveScriptId || data.disabled) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!characterContext) return;
    const ca = characterContext.getCharacterAttribute(toggleAttributeId);
    if (!ca || ca.type !== 'boolean') return;
    const next = !coerceAttributeBoolean(ca.value);
    characterContext.updateCharacterAttribute(ca.id, { value: next });
  };

  return (
    <div role='button' className='clickable' onClick={handleClick}>
      {children}
    </div>
  );
};
