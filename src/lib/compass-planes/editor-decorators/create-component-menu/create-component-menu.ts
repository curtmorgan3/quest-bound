import { colorPaper } from '@/palette';
import { Container, Graphics, type Container as TContainer } from 'pixi.js';
import { drawCreateComponentButton } from './component-button-base';

export async function drawComponentContainerMenu(): Promise<TContainer> {
  const menuWidth = 220;
  const menuHeight = 44;

  const viewportWidth = window.visualViewport?.width ?? 0;
  const viewportHeight = window.visualViewport?.height ?? 0;
  const sidebarWidth = 47;

  const menuContainer = new Container({
    label: `create-component-menu`,
    y: viewportHeight - 120,
    x: (viewportWidth - menuWidth - sidebarWidth) / 2,
  });

  const menu = new Container({
    eventMode: 'static',
    label: `create-component-menu`,
    layout: {
      gap: 2,
      padding: 8,
    },
  });

  menuContainer.addChild(menu);

  const bg = new Graphics().roundRect(0, 0, menuWidth, menuHeight, 8).fill(colorPaper);
  menu.addChild(bg);

  drawCreateComponentButton(menu, 'shape');

  menu.onRender = () => {
    const newViewportWidth = window.visualViewport?.width ?? 0;
    if (newViewportWidth === viewportWidth) return;
    menuContainer.x = (newViewportWidth - menuWidth - sidebarWidth) / 2;
  };

  return menuContainer;
}
