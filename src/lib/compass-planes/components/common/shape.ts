import type { Component } from '@/types';
import { Graphics, type Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';
import { drawBase } from '../decorators';

/**
 * Draws a rounded rectangle with individual corner radii using Graphics path commands.
 */
function drawRoundedRectWithCorners(
  graphics: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  topLeft: number,
  topRight: number,
  bottomRight: number,
  bottomLeft: number,
) {
  // Clamp radii to prevent them from being larger than half the width/height
  const maxRadius = Math.min(width, height) / 2;
  const tl = Math.min(topLeft, maxRadius);
  const tr = Math.min(topRight, maxRadius);
  const br = Math.min(bottomRight, maxRadius);
  const bl = Math.min(bottomLeft, maxRadius);

  // Start from top-left corner (after the radius if it exists)
  graphics.moveTo(x + tl, y);

  // Top edge to top-right corner
  if (tr > 0) {
    graphics.lineTo(x + width - tr, y);
    // Arc for top-right corner: center at (x + width - tr, y + tr), radius = tr
    // Start angle: -π/2 (top), End angle: 0 (right)
    graphics.arc(x + width - tr, y + tr, tr, -Math.PI / 2, 0, false);
  } else {
    graphics.lineTo(x + width, y);
  }

  // Right edge to bottom-right corner
  if (br > 0) {
    graphics.lineTo(x + width, y + height - br);
    // Arc for bottom-right corner: center at (x + width - br, y + height - br), radius = br
    // Start angle: 0 (right), End angle: π/2 (bottom)
    graphics.arc(x + width - br, y + height - br, br, 0, Math.PI / 2, false);
  } else {
    graphics.lineTo(x + width, y + height);
  }

  // Bottom edge to bottom-left corner
  if (bl > 0) {
    graphics.lineTo(x + bl, y + height);
    // Arc for bottom-left corner: center at (x + bl, y + height - bl), radius = bl
    // Start angle: π/2 (bottom), End angle: π (left)
    graphics.arc(x + bl, y + height - bl, bl, Math.PI / 2, Math.PI, false);
  } else {
    graphics.lineTo(x, y + height);
  }

  // Left edge back to top-left corner
  if (tl > 0) {
    graphics.lineTo(x, y + tl);
    // Arc for top-left corner: center at (x + tl, y + tl), radius = tl
    // Start angle: π (left), End angle: 3π/2 (top)
    graphics.arc(x + tl, y + tl, tl, Math.PI, Math.PI * 1.5, false);
  } else {
    graphics.lineTo(x, y);
  }

  graphics.closePath();
}

export function drawShape(parent: Container, component: Component) {
  const graphics = new Graphics({
    label: component.id,
  });

  const initialZoom = getZoom();
  const topLeft = (component.borderRadiusTopLeft ?? 0) * initialZoom;
  const topRight = (component.borderRadiusTopRight ?? 0) * initialZoom;
  const bottomRight = (component.borderRadiusBottomRight ?? 0) * initialZoom;
  const bottomLeft = (component.borderRadiusBottomLeft ?? 0) * initialZoom;

  const hasAnyRadius = topLeft > 0 || topRight > 0 || bottomRight > 0 || bottomLeft > 0;

  if (hasAnyRadius) {
    drawRoundedRectWithCorners(
      graphics,
      0,
      0,
      component.width * initialZoom,
      component.height * initialZoom,
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    );
  } else {
    graphics.rect(0, 0, component.width * initialZoom, component.height * initialZoom);
  }
  graphics.fill('#FFF');
  graphics.tint = component.color;

  let lastTopLeft = component.borderRadiusTopLeft ?? 0;
  let lastTopRight = component.borderRadiusTopRight ?? 0;
  let lastBottomRight = component.borderRadiusBottomRight ?? 0;
  let lastBottomLeft = component.borderRadiusBottomLeft ?? 0;
  let lastWidth = component.width;
  let lastHeight = component.height;

  graphics.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    const currentTopLeft = componentState.borderRadiusTopLeft ?? 0;
    const currentTopRight = componentState.borderRadiusTopRight ?? 0;
    const currentBottomRight = componentState.borderRadiusBottomRight ?? 0;
    const currentBottomLeft = componentState.borderRadiusBottomLeft ?? 0;
    const currentWidth = componentState.width;
    const currentHeight = componentState.height;
    const zoom = getZoom();

    // Check if we need to redraw the shape
    const needsRedraw =
      currentTopLeft !== lastTopLeft ||
      currentTopRight !== lastTopRight ||
      currentBottomRight !== lastBottomRight ||
      currentBottomLeft !== lastBottomLeft ||
      currentWidth !== lastWidth ||
      currentHeight !== lastHeight;

    if (needsRedraw) {
      graphics.clear();
      const scaledTopLeft = currentTopLeft * zoom;
      const scaledTopRight = currentTopRight * zoom;
      const scaledBottomRight = currentBottomRight * zoom;
      const scaledBottomLeft = currentBottomLeft * zoom;

      const hasAnyRadius =
        scaledTopLeft > 0 || scaledTopRight > 0 || scaledBottomRight > 0 || scaledBottomLeft > 0;

      if (hasAnyRadius) {
        drawRoundedRectWithCorners(
          graphics,
          0,
          0,
          currentWidth * zoom,
          currentHeight * zoom,
          scaledTopLeft,
          scaledTopRight,
          scaledBottomRight,
          scaledBottomLeft,
        );
      } else {
        graphics.rect(0, 0, currentWidth * zoom, currentHeight * zoom);
      }
      graphics.fill('#FFF');

      lastTopLeft = currentTopLeft;
      lastTopRight = currentTopRight;
      lastBottomRight = currentBottomRight;
      lastBottomLeft = currentBottomLeft;
      lastWidth = currentWidth;
      lastHeight = currentHeight;
    }

    // Update color tint if changed
    if (componentState.color && componentState.color !== component.color) {
      graphics.tint = componentState.color;
      component.color = componentState.color;
    }
  };

  drawBase(parent, component).addChild(graphics);
}
