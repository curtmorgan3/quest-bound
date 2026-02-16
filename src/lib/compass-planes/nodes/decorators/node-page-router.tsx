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
  const pageId = getComponentData(component).pageId;

  if (!pageId) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    next.set('pageId', pageId);
    setSearchParams(next);
  };

  return (
    <div onClick={handleClick} className='cursor-pointer'>
      {children}
    </div>
  );
};
