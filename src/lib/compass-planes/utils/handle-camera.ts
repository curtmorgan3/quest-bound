import { Ticker, type Application } from 'pixi.js';
import { componentsAreDragging, getZoom, setZoom, toggleZooming } from '../cache';

let lastZoom = getZoom();

const zoom_enabled = false;

export const addCameraHandlers = (app: Application) => {
  const ticker = new Ticker();

  app.stage.on('wheel', (e) => {
    if (componentsAreDragging() || !zoom_enabled) return;
    toggleZooming(true);
    e.stopPropagation();
    e.preventDefault();

    // Zooming out
    if (e.deltaY > 0) {
      setZoom(getZoom() * 0.9);
      // Zooming in
    } else {
      setZoom(getZoom() * 1.1);
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
