import type { Component } from '@/types';
import { BitmapText as PixiText, type Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';
import { drawBase } from '../decorators';

export function drawText(parent: Container, component: Component) {
  const initialZoom = getZoom();
  const textContent = component.text ?? 'Text';
  const fontSize = component.fontSize ?? 16;
  const fontFamily = component.fontFamily ?? 'Arial';
  const fontWeight = component.fontWeight;
  const textAlign = component.textAlign ?? 'left';
  const textColor = component.color ?? '#000000';

  // Create PixiJS Text with initial style
  const pixiText = new PixiText({
    text: textContent,
    style: {
      fontFamily,
      fontSize: fontSize,
      // fontSize: 60,
      fontWeight,
      fill: textColor,
      align: textAlign,
      wordWrap: true,
      wordWrapWidth: component.width,
      lineHeight: (component.lineHeight ?? 1.2) * fontSize * initialZoom,
    },
    label: component.id,
  });

  // Track last values for change detection
  let lastText = textContent;
  let lastFontSize = fontSize;
  let lastFontFamily = fontFamily;
  let lastFontWeight = fontWeight;
  let lastTextAlign = textAlign;
  let lastColor = textColor;
  let lastWidth = component.width;
  let lastHeight = component.height;
  let lastLineHeight = component.lineHeight ?? 1.2;

  pixiText.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    const zoom = getZoom();
    const currentText = componentState.text ?? 'Text';
    const currentFontSize = componentState.fontSize ?? 16;
    const currentFontFamily = componentState.fontFamily ?? 'Arial';
    const currentFontWeight = componentState.fontWeight ?? 'normal';
    const currentTextAlign = componentState.textAlign ?? 'left';
    const currentColor = componentState.color ?? '#000000';
    const currentWidth = componentState.width;
    const currentHeight = componentState.height;
    const currentLineHeight = componentState.lineHeight ?? 1.2;

    // Check if we need to update the text
    const needsUpdate =
      currentText !== lastText ||
      currentFontSize !== lastFontSize ||
      currentFontFamily !== lastFontFamily ||
      currentFontWeight !== lastFontWeight ||
      currentTextAlign !== lastTextAlign ||
      currentColor !== lastColor ||
      currentWidth !== lastWidth ||
      currentHeight !== lastHeight ||
      currentLineHeight !== lastLineHeight;

    if (needsUpdate) {
      // Update text content
      if (currentText !== lastText) {
        pixiText.text = currentText;
      }

      // Update style properties
      const style = pixiText.style;
      style.fontSize = currentFontSize * zoom;
      style.fontFamily = currentFontFamily;
      style.fontWeight = currentFontWeight;
      style.fill = currentColor;
      style.align = currentTextAlign;
      style.wordWrapWidth = currentWidth * zoom;
      style.lineHeight = currentLineHeight * currentFontSize * zoom;

      // Update component dimensions if text size changed
      if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
        // Text will auto-size based on wordWrapWidth, but we can update bounds
        // pixiText.updateText(true);
      }

      // Update tracked values
      lastText = currentText;
      lastFontSize = currentFontSize;
      lastFontFamily = currentFontFamily;
      lastFontWeight = currentFontWeight;
      lastTextAlign = currentTextAlign;
      lastColor = currentColor;
      lastWidth = currentWidth;
      lastHeight = currentHeight;
      lastLineHeight = currentLineHeight;
    }
  };

  drawBase(parent, component).addChild(pixiText);
}
