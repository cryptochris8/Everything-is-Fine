// Canvas textures for the few things that need lettering (den sign). Without a
// DOM / 2D context (tests) these return null and models fall back to geometry.
// Textures are cached by key and shared — never dispose them per instance.
import * as THREE from 'three';
import { markShared } from './shared';

export const DISPLAY_FONT = '"Luckiest Guy", "Arial Black", Impact, sans-serif';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function make2d(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  try {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c.getContext('2d');
  } catch {
    return null;
  }
}

const cache = new Map<string, THREE.CanvasTexture | null>();

/** Cached canvas texture; redraws once the display font has loaded. */
export function canvasTexture(key: string, w: number, h: number, draw: Draw): THREE.CanvasTexture | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  const ctx = make2d(w, h);
  if (!ctx) {
    cache.set(key, null);
    return null;
  }
  draw(ctx, w, h);
  const tex = markShared(new THREE.CanvasTexture(ctx.canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts && !fonts.check(`40px ${DISPLAY_FONT}`)) {
    fonts
      .load(`40px "Luckiest Guy"`)
      .then((loaded) => {
        if (!loaded.length) return;
        ctx.clearRect(0, 0, w, h);
        draw(ctx, w, h);
        tex.needsUpdate = true;
      })
      .catch(() => undefined);
  }
  return tex;
}
