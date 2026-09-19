/**
 * Procedural canvas textures for the Casebook corkboard engine.
 * Ported from the reference app (TEX module, index.html lines ~1294–1493)
 * and adapted to three r185 (colorSpace instead of encoding).
 */
import * as THREE from 'three';
import { BOARD_H, BOARD_W } from './types';
import { rnd } from './util';

/** Word-wrap helper — returns the final y after drawing. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
): number {
  const words = String(text).split(/\s+/);
  let line = '',
    yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTex(c: HTMLCanvasElement, repeat?: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat * (BOARD_H / BOARD_W));
  }
  return t;
}

export function cork(): THREE.CanvasTexture {
  const c = canvas(1024, 1024),
    x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1024, 1024);
  g.addColorStop(0, '#a37c42');
  g.addColorStop(0.5, '#95703a');
  g.addColorStop(1, '#8a6634');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 14000; i++) {
    const s = rnd(0.6, 3.4);
    x.fillStyle =
      Math.random() < 0.5
        ? `rgba(60,42,20,${rnd(0.05, 0.28)})`
        : `rgba(210,175,120,${rnd(0.04, 0.2)})`;
    x.beginPath();
    x.ellipse(
      Math.random() * 1024,
      Math.random() * 1024,
      s,
      s * rnd(0.5, 1),
      Math.random() * 3,
      0,
      7,
    );
    x.fill();
  }
  for (let i = 0; i < 260; i++) {
    x.fillStyle = `rgba(${rnd(70, 120) | 0},${rnd(50, 85) | 0},${rnd(25, 45) | 0},${rnd(0.12, 0.3)})`;
    x.beginPath();
    x.ellipse(
      Math.random() * 1024,
      Math.random() * 1024,
      rnd(4, 13),
      rnd(3, 8),
      Math.random() * 3,
      0,
      7,
    );
    x.fill();
  }
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(30,20,8,${rnd(0.15, 0.4)})`;
    x.beginPath();
    x.arc(Math.random() * 1024, Math.random() * 1024, rnd(1, 2.2), 0, 7);
    x.fill();
  }
  return toTex(c, 3);
}

export function corkBump(): THREE.CanvasTexture {
  const c = canvas(512, 512),
    x = c.getContext('2d')!;
  x.fillStyle = '#808080';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = (Math.random() * 120 + 70) | 0;
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(Math.random() * 512, Math.random() * 512, rnd(1, 3), rnd(1, 3));
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 4);
  return t;
}

export function wood(): THREE.CanvasTexture {
  const c = canvas(1024, 256),
    x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#3c2a18');
  g.addColorStop(0.5, '#4d3620');
  g.addColorStop(1, '#33220f');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(${rnd(15, 40) | 0},${rnd(10, 26) | 0},${rnd(4, 12) | 0},${rnd(0.2, 0.6)})`;
    x.lineWidth = rnd(0.6, 2.6);
    x.beginPath();
    const y = Math.random() * 256;
    x.moveTo(0, y);
    for (let px = 0; px <= 1024; px += 64)
      x.lineTo(px, y + Math.sin(px * 0.01 + i) * rnd(2, 7));
    x.stroke();
  }
  const t = toTex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

export function fiber(): THREE.CanvasTexture {
  const c = canvas(128, 128),
    x = c.getContext('2d')!;
  x.fillStyle = '#808080';
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 64; i++) {
    x.strokeStyle =
      Math.random() < 0.5 ? 'rgba(40,40,40,.5)' : 'rgba(220,220,220,.5)';
    x.lineWidth = rnd(1, 2.5);
    x.beginPath();
    const o = Math.random() * 128;
    x.moveTo(-20, o);
    x.lineTo(148, o + 64);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 14);
  return t;
}

export function grain(
  x: CanvasRenderingContext2D,
  w: number,
  h: number,
  amt: number,
): void {
  for (let i = 0; i < amt; i++) {
    x.fillStyle = `rgba(${rnd(90, 160) | 0},${rnd(80, 140) | 0},${rnd(60, 110) | 0},${rnd(0.02, 0.07)})`;
    x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
  }
}

export function pinholes(x: CanvasRenderingContext2D, w: number): void {
  for (let i = 0, n = rnd(1, 3) | 0; i < n; i++) {
    const px = w / 2 + rnd(-30, 30),
      py = rnd(18, 34);
    x.fillStyle = 'rgba(50,35,15,.85)';
    x.beginPath();
    x.arc(px, py, 3.4, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.25)';
    x.beginPath();
    x.arc(px - 1, py - 1, 1.4, 0, 7);
    x.fill();
  }
}
