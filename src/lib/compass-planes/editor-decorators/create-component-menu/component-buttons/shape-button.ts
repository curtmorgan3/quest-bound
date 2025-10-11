import { setPlacingType } from '@/lib/compass-planes/cache';
import { getEditorAsset } from '@/lib/compass-planes/utils';
import { Sprite, Texture, type Container } from 'pixi.js';

export const drawShapeButton = async (menu: Container) => {
  const shapeAsset = await getEditorAsset('shape-tool.png');
  const shapeTexture = Texture.from(shapeAsset);
  const shapeSprite = new Sprite(shapeTexture);

  shapeSprite.position.set(10, 8);

  shapeSprite.on('click', () => {
    setPlacingType('shape');
  });

  menu.addChild(shapeSprite);
};
