import type { Container as TContainer } from 'pixi.js';
import { Point, Texture, Ticker, TilingSprite } from 'pixi.js';
import { getCameraPosition, getZoom } from '../cache';
import { getEditorAsset } from '../utils';

/**
 * Draws grid based on editor styles.
 */
export const drawGrid = async (parent: TContainer) => {
  const ticker = new Ticker();
  const gridImage = await getEditorAsset('grid-square.png');

  const tilingSprite = new TilingSprite({
    texture: Texture.from(gridImage),
    width: window.innerWidth,
    height: window.innerHeight,
    alpha: 0.3,
  });

  parent.addChild(tilingSprite);

  ticker.add(() => {
    const cameraPos = getCameraPosition();
    const zoom = getZoom();
    tilingSprite.tilePosition = new Point(cameraPos.x * -1, cameraPos.y * -1);
    tilingSprite.scale = zoom;
    tilingSprite.width = window.innerWidth / zoom;
    tilingSprite.height = window.innerHeight / zoom;
  });

  ticker.start();
};
