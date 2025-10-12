import type { ComponentType } from '@/lib/compass-planes';
import { getPlacingType, setPlacingType } from '@/lib/compass-planes/cache';
import { getEditorAsset } from '@/lib/compass-planes/utils';
import { colorPrimary, colorWhite } from '@/palette';
import { Sprite, Texture, type Container } from 'pixi.js';

export const drawCreateComponentButton = async (
  menu: Container,
  type: ComponentType,
  index = 0,
) => {
  const asset = await getEditorAsset(`${type}-tool.png`);
  const texture = Texture.from(asset);
  const sprite = new Sprite(texture);

  const gap = 10;
  const spriteWidth = 28;
  const posX = gap + spriteWidth * index;

  sprite.position.set(posX, 8);

  sprite.on('click', () => {
    setPlacingType(type);
  });

  sprite.onRender = () => {
    if (getPlacingType() === type) {
      sprite.tint = colorPrimary;
    } else {
      sprite.tint = colorWhite;
    }
  };

  menu.addChild(sprite);
};
