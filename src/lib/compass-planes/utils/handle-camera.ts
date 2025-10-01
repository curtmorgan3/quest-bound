import { Ticker, type Application } from 'pixi.js';
import { componentsAreDragging, getZoom, setZoom, toggleZooming } from '../cache';

let lastZoom = getZoom();

const zoom_enabled = true;

export const addCameraHandlers = (app: Application) => {
  const ticker = new Ticker();

  app.stage.on('wheel', (e) => {
    if (componentsAreDragging() || !zoom_enabled) return;
    if (!e.shiftKey) return;
    toggleZooming(true);
    e.stopPropagation();
    e.preventDefault();

    // Zooming out
    if (e.deltaY > 0) {
      setZoom(getZoom() * 0.99);
      // Zooming in
    } else {
      setZoom(getZoom() * 1.01);
    }

    setTimeout(() => {
      toggleZooming(false);
    }, 200);
  });

  ticker.add(() => {
    if (lastZoom !== getZoom()) {
      app.renderer.render(app.stage);
      lastZoom = getZoom();
    }
  });

  ticker.start();
};
