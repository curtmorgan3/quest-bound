import type { Component } from '@/types';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getComponentData } from '../../utils';

interface NodePageRouterProps {
  children: ReactNode;
  component: Component;
}

/**
 * Wraps node content when the component has a pageId. On click, sets the pageId
 * in the URL search params so the app can navigate or display that page.
 */
export const NodePageRouter = ({ children, component }: NodePageRouterProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pageId, href } = getComponentData(component);

  const handleClick = (e: React.MouseEvent) => {
    if (!pageId) return;
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    next.set('pageId', pageId);
    setSearchParams(next);
  };

  if (pageId) {
    return (
      <div onClick={handleClick} className='cursor-pointer'>
        {children}
      </div>
    );
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
