import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { gsap } from 'gsap';
import {
  bentPaperGeo,
  pointInPoly,
  createRig,
  screenToBoard,
  worldToScreen,
  boardProjector,
  createDust,
  initRopeContext,
  anchorOf,
  createCursorAnchor,
  Rope,
} from '@/lib/board/casebook/geometry';
import { BOARD_W, BOARD_H, Z_HOME } from '@/lib/board/casebook/types';
import type { BoardItem, RopeAnchor, RopeLike } from '@/lib/board/casebook/types';

const VIEW_W = 800;
const VIEW_H = 600;

function stubItem(): BoardItem {
  return {
    ropes: [] as RopeLike[],
    grp: { visible: true } as unknown as THREE.Group,
  } as unknown as BoardItem;
}

const fixedAnchor = (x: number, y: number, z: number): RopeAnchor => ({
  item: null,
  get: (v) => v.set(x, y, z),
});

describe('pointInPoly', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  // L-shaped concave polygon: left strip + bottom strip
  const ell = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 10 },
    { x: 0, y: 10 },
  ];

  it('detects points inside and outside a square', () => {
    expect(pointInPoly({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPoly({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPoly({ x: -1, y: 5 }, square)).toBe(false);
    expect(pointInPoly({ x: 5, y: -1 }, square)).toBe(false);
    expect(pointInPoly({ x: 5, y: 11 }, square)).toBe(false);
  });

  it('handles points near the boundary', () => {
    expect(pointInPoly({ x: 0.001, y: 5 }, square)).toBe(true);
    expect(pointInPoly({ x: -0.001, y: 5 }, square)).toBe(false);
    expect(pointInPoly({ x: 9.999, y: 9.999 }, square)).toBe(true);
  });

  it('respects the notch of a concave polygon', () => {
    expect(pointInPoly({ x: 2, y: 7 }, ell)).toBe(true); // left strip
    expect(pointInPoly({ x: 7, y: 2 }, ell)).toBe(true); // bottom strip
    expect(pointInPoly({ x: 7, y: 7 }, ell)).toBe(false); // the notch
    expect(pointInPoly({ x: 12, y: 2 }, ell)).toBe(false);
  });
});

describe('createRig', () => {
  it('eases x toward tx', () => {
    const rig = createRig();
    const cam = new THREE.PerspectiveCamera(30, VIEW_W / VIEW_H, 0.1, 700);
    const lamp = new THREE.Object3D();
    rig.tx = 10;
    rig.apply(0, cam, lamp);
    expect(rig.x).toBeCloseTo(1.2, 6); // 0 + (10 - 0) * 0.12
    rig.apply(0.016, cam, lamp);
    expect(rig.x).toBeGreaterThan(1.2);
    expect(rig.x).toBeLessThan(10);
    // camera is offset by +3.2/+2.1, lamp tracks the rig point
    expect(cam.position.x).toBeCloseTo(rig.x + 3.2, 5);
    expect(cam.position.y).toBeCloseTo(rig.y + 2.1, 5);
    expect(lamp.position.x).toBeCloseTo(rig.x, 6);
    expect(lamp.position.y).toBeCloseTo(rig.y, 6);
  });

  it('decays fling velocity', () => {
    const rig = createRig();
    const cam = new THREE.PerspectiveCamera(30, VIEW_W / VIEW_H, 0.1, 700);
    const lamp = new THREE.Object3D();
    rig.vx = 1;
    rig.vy = -1;
    rig.apply(0, cam, lamp);
    expect(rig.vx).toBeCloseTo(0.92, 6);
    expect(rig.vy).toBeCloseTo(-0.92, 6);
    for (let i = 0; i < 100; i++) rig.apply(i / 60, cam, lamp);
    expect(rig.vx).toBe(0);
    expect(rig.vy).toBe(0);
  });

  it('clamps tx/ty to board bounds when velocity pushes past limits', () => {
    const rig = createRig();
    const cam = new THREE.PerspectiveCamera(30, VIEW_W / VIEW_H, 0.1, 700);
    const lamp = new THREE.Object3D();
    rig.vx = 1000;
    rig.vy = -1000;
    rig.apply(0, cam, lamp);
    expect(rig.tx).toBe(BOARD_W / 2 - 8);
    expect(rig.ty).toBe(-BOARD_H / 2 + 6);
  });

  it('wake() resets the idle breathing timer', () => {
    const rig = createRig();
    rig.idle = 10;
    rig.wake();
    expect(rig.idle).toBe(0);
  });
});

describe('screenToBoard / worldToScreen', () => {
  it('round-trips a board point through screen space', () => {
    // position camera like the rig does: (x+3.2, y+2.1, z) looking at (x, y, 0)
    const cam = new THREE.PerspectiveCamera(30, VIEW_W / VIEW_H, 0.1, 700);
    cam.position.set(3.2, 3.1, Z_HOME);
    cam.lookAt(0, 1, 0);
    cam.updateMatrixWorld(true);

    const p = new THREE.Vector3(-10, 5, 0);
    const s = worldToScreen(cam, VIEW_W, VIEW_H, p);
    expect(s.x).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(VIEW_W);
    expect(s.y).toBeGreaterThan(0);
    expect(s.y).toBeLessThan(VIEW_H);

    const back = screenToBoard(cam, VIEW_W, VIEW_H, s.x, s.y, 0);
    expect(back.x).toBeCloseTo(p.x, 4);
    expect(back.y).toBeCloseTo(p.y, 4);
    expect(back.z).toBeCloseTo(0, 4);
  });

  it('round-trips at a non-zero plane z', () => {
    const cam = new THREE.PerspectiveCamera(30, VIEW_W / VIEW_H, 0.1, 700);
    cam.position.set(3.2, 3.1, Z_HOME);
    cam.lookAt(0, 1, 0);
    cam.updateMatrixWorld(true);

    const p = new THREE.Vector3(20, -8, 1.05);
    const s = worldToScreen(cam, VIEW_W, VIEW_H, p);
    const back = screenToBoard(cam, VIEW_W, VIEW_H, s.x, s.y, 1.05);
    expect(back.x).toBeCloseTo(p.x, 4);
    expect(back.y).toBeCloseTo(p.y, 4);
    expect(back.z).toBeCloseTo(p.z, 4);
  });
});

describe('bentPaperGeo', () => {
  it('produces a 12x12-segment plane vertex grid', () => {
    const g = bentPaperGeo(4, 3, 0.5);
    expect(g.attributes.position.count).toBe(13 * 13);
  });

  it('displaces vertices in z when curl > 0', () => {
    const g = bentPaperGeo(4, 3, 0.5);
    const p = g.attributes.position;
    let maxZ = -Infinity;
    for (let i = 0; i < p.count; i++) maxZ = Math.max(maxZ, p.getZ(i));
    expect(maxZ).toBeGreaterThan(0);
    expect(g.attributes.normal).toBeDefined();
  });

  it('stays flat when curl = 0', () => {
    const g = bentPaperGeo(4, 3, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) expect(p.getZ(i)).toBe(0);
  });
});

describe('boardProjector', () => {
  it('maps board corners into padded canvas coords (y flipped)', () => {
    const pr = boardProjector(200, 100, 6);
    expect(pr.x(-BOARD_W / 2)).toBeCloseTo(6, 6);
    expect(pr.x(BOARD_W / 2)).toBeCloseTo(194, 6);
    expect(pr.y(BOARD_H / 2)).toBeCloseTo(6, 6);
    expect(pr.y(-BOARD_H / 2)).toBeCloseTo(94, 6);
  });
});

describe('createDust', () => {
  it('returns a Points object whose positions drift and stay finite', () => {
    const dust = createDust();
    expect(dust.object).toBeInstanceOf(THREE.Points);
    const a = dust.object.geometry.getAttribute('position');
    expect(a.count).toBe(220);
    const before = (a.array as Float32Array).slice();
    dust.step(1 / 60, 1.23);
    const after = a.array as Float32Array;
    let moved = false;
    for (let i = 0; i < after.length; i++) {
      expect(Number.isFinite(after[i])).toBe(true);
      if (after[i] !== before[i]) moved = true;
    }
    expect(moved).toBe(true);
  });
});

describe('Rope', () => {
  let scene: THREE.Scene;

  beforeAll(() => {
    scene = new THREE.Scene();
    initRopeContext({ scene });
  });

  it('constructs a non-live rope pinned between two fixed anchors', () => {
    const r = new Rope(fixedAnchor(0, 1, 1), fixedAnchor(8, 1, 1), 0xb01722);
    expect(scene.children).toContain(r.mesh);
    expect(r.live).toBe(false);
    expect(r.pts).toHaveLength(46);
    // stop the grow-in tween so the far endpoint settles on its anchor
    gsap.killTweensOf(r);
    r.grow = 1;
    for (let i = 0; i < 12; i++) r.step(1 / 60, i / 60);
    for (const p of r.pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
    expect(r.pts[0].x).toBeCloseTo(0, 5);
    expect(r.pts[0].y).toBeCloseTo(1, 5);
    expect(r.pts[0].z).toBeCloseTo(1, 5);
    expect(r.pts[45].x).toBeCloseTo(8, 5);
    expect(r.pts[45].y).toBeCloseTo(1, 5);
    expect(r.pts[45].z).toBeCloseTo(1, 5);
    // slack thread sags below the chord
    expect(r.pts[22].y).toBeLessThan(1);
  });

  it('render() produces a tube geometry with a position attribute', () => {
    const r = new Rope(fixedAnchor(0, 0, 1), fixedAnchor(6, 2, 1), 0xc9a76a);
    gsap.killTweensOf(r);
    r.grow = 1;
    r.step(1 / 60, 0);
    r.render();
    const pos = r.mesh.geometry.getAttribute('position');
    expect(pos).toBeDefined();
    expect(pos.count).toBeGreaterThan(0);
  });

  it('other() returns the opposite endpoint item', () => {
    const itemA = stubItem();
    const itemB = stubItem();
    const r = new Rope(
      { item: itemA, get: (v) => v.set(0, 1, 1) },
      { item: itemB, get: (v) => v.set(8, 1, 1) },
      0x2f5f9e,
    );
    expect(r.other(itemA)).toBe(itemB);
    expect(r.other(itemB)).toBe(itemA);
    // constructor registers itself on both items
    expect(itemA.ropes).toContain(r);
    expect(itemB.ropes).toContain(r);
  });

  it('detach() removes the rope from both item.ropes lists', () => {
    const itemA = stubItem();
    const itemB = stubItem();
    const r = new Rope(
      { item: itemA, get: (v) => v.set(0, 1, 1) },
      { item: itemB, get: (v) => v.set(8, 1, 1) },
      0x22201d,
    );
    expect(itemA.ropes).toContain(r);
    expect(itemB.ropes).toContain(r);
    r.detach();
    expect(itemA.ropes).not.toContain(r);
    expect(itemB.ropes).not.toContain(r);
  });

  it('syncVisible() hides the mesh when either endpoint item is hidden', () => {
    const itemA = stubItem();
    const itemB = stubItem();
    const r = new Rope(
      { item: itemA, get: (v) => v.set(0, 1, 1) },
      { item: itemB, get: (v) => v.set(8, 1, 1) },
      0xb01722,
    );
    expect(r.mesh.visible).toBe(true);
    (itemB.grp as unknown as { visible: boolean }).visible = false;
    r.syncVisible();
    expect(r.mesh.visible).toBe(false);
  });

  it('tie() binds a live rope to an item and registers it', () => {
    const itemA = stubItem();
    const itemB = stubItem();
    const cursor = createCursorAnchor();
    cursor.pos.set(4, 4, 1);
    const r = new Rope(
      { item: itemA, get: (v) => v.set(0, 1, 1) },
      cursor,
      0xb01722,
      { live: true },
    );
    expect(r.live).toBe(true);
    expect(itemB.ropes).not.toContain(r);
    // stub pin head so anchorOf can read a world position
    const head = new THREE.Object3D();
    head.position.set(9, 3, 1);
    (itemB as { pin: THREE.Group }).pin = { userData: { head } } as unknown as THREE.Group;
    r.tie(itemB);
    expect(r.live).toBe(false);
    expect(itemB.ropes).toContain(r);
    expect(r.b.item).toBe(itemB);
    r.step(1 / 60, 0);
    const end = r.pts[r.N - 1];
    expect(end.x).toBeCloseTo(9, 4);
    expect(end.y).toBeCloseTo(3, 4);
  });

  it('kill() flags the rope as dying and frees the b end', () => {
    const r = new Rope(fixedAnchor(0, 1, 1), fixedAnchor(8, 1, 1), 0xb01722);
    r.kill();
    expect(r.dying).toBe(true);
    expect(r.freeB).toBe(true);
    // the b endpoint is released — it is no longer forced onto the anchor
    gsap.killTweensOf(r);
    for (let i = 0; i < 30; i++) r.step(1 / 60, i / 60);
    for (const p of r.pts) expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
    expect(r.pts[0].x).not.toBeCloseTo(0, 5); // dying frees both pins
  });
});
