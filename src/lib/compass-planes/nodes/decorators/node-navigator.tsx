import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import {
  navigateCharacterToTemplatePage,
  openCharacterSheetWindow,
} from '@/lib/compass-api/utils/navigate-character-sheet';
import { useWindowRuntime } from '@/lib/compass-planes/sheet-viewer/window-runtime-context';
import { CharacterContext } from '@/stores';
import type { Component, ComponentData } from '@/types';
import { useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComponentData } from '../../utils';

interface NodeNavigatorProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
}

/**
 * When the component has no click script, navigates on click using data in this order:
 * `pageId` (character sheet page), then `childWindowId` (character or ruleset template window),
 * then `href` (opens in a new tab).
 */
export const NodeNavigator = ({ children, component, componentData }: NodeNavigatorProps) => {
  const data = componentData ?? getComponentData(component);
  const navigate = useNavigate();
  const { scripts } = useScripts();
  const characterContext = useContext(CharacterContext);
  const { openRulesetChildWindow } = useWindowRuntime();
  const characterId = characterContext?.character?.id;

  const pageTemplateId = data.pageId;
  const childWindowId = component.childWindowId;
  const href = data.href;

  const hasVisibleClickScript = useMemo(() => {
    if (!component.scriptId) return false;
    const s = scripts.find((x) => x.id === component.scriptId);
    return Boolean(s && !s.hidden);
  }, [component.scriptId, scripts]);

  const handleProgrammaticNav = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (pageTemplateId) {
        if (characterId) {
          const characterPageId = await navigateCharacterToTemplatePage(
            characterId,
            pageTemplateId,
          );
          if (characterPageId) {
            navigate(`/characters/${characterId}?pageId=${characterPageId}`);
          }
        }
        return;
      }
      if (childWindowId) {
        if (openRulesetChildWindow) {
          openRulesetChildWindow(childWindowId);
          return;
        }
        if (characterId) {
          await openCharacterSheetWindow(characterId, childWindowId, {
            x: data.childWindowX,
            y: data.childWindowY,
            collapseIfOpen: data.childWindowCollapse ?? false,
          });
        }
      }
    },
    [
      pageTemplateId,
      childWindowId,
      characterId,
      navigate,
      openRulesetChildWindow,
      data.childWindowX,
      data.childWindowY,
      data.childWindowCollapse,
    ],
  );

  if (hasVisibleClickScript) {
    return <>{children}</>;
  }

  if (pageTemplateId || childWindowId) {
    return (
      <div
        role='button'
        className='clickable'
        style={{ display: 'block', width: '100%', height: '100%' }}
        onClick={handleProgrammaticNav}>
        {children}
      </div>
    );
  }

  if (href) {
    return (
      <a
        target='_blank'
        rel='noopener noreferrer'
        href={href}
        className='block h-full w-full'
        onClick={(e) => e.stopPropagation()}>
        {children}
      </a>
    );
  }

  return <>{children}</>;
};
