import { getComponentData, resolveEffectiveScriptId } from '@/lib/compass-planes/utils';
import type { Component } from '@/types';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface NodeAttributeEditPanelControlProps {
  children: ReactNode;
  component: Component;
}

/**
 * Wraps node content when the component has a viewAttributeId set.
 * On click, sets the editAttributeId query param to open the attribute edit panel.
 * When the component has an effective click script (row or per-state overlay), the script takes precedence and this decorator is a no-op.
 */
export const NodeAttributeEditPanelControl = ({
  children,
  component,
}: NodeAttributeEditPanelControlProps) => {
  const [, setSearchParams] = useSearchParams();
  const data = getComponentData(component);
  const { viewAttributeId } = data;
  const effectiveScriptId = resolveEffectiveScriptId(component, data);

  if (!viewAttributeId || effectiveScriptId || data.disabled) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('editAttributeId', viewAttributeId);
      if (data.viewAttributeReadOnly) {
        next.set('readOnly', 'true');
      } else {
        next.delete('readOnly');
      }
      return next;
    });
  };

  return (
    <div role='button' className='clickable' onClick={handleClick}>
      {children}
    </div>
  );
};
