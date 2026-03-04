import type { Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import { getComponentData } from '../../utils';

interface NodePageRouterProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
}

/**
 * Wraps node content when the component has an external href.
 * For components whose click behavior is handled by a script (scriptId set),
 * this decorator is a no-op.
 */
export const NodePageRouter = ({ children, component, componentData }: NodePageRouterProps) => {
  const data = componentData ?? getComponentData(component);
  const { href } = data;

  if (component.scriptId) {
    return <>{children}</>;
  }

  if (href) {
    return (
      <a target='_blank' href={href}>
        {children}
      </a>
    );
  }

  return <>{children}</>;
};
