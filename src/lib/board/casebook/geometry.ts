/**
 * Geometry, camera and rope helpers for the Casebook corkboard engine.
 * Ported from the reference app (casebook — Blackwood Dossier, three.js r128).
 *
 * The reference kept `scene`, `camera`, `lamp` and `fiberTex` as module
 * globals; here they are passed in (camera/lamp per call) or provided once via
 * initRopeContext() (scene/fiberTex for Rope).
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { BOARD_W, BOARD_H, PIN_Z, Z_HOME } from './types';
import type { BoardItem, RopeAnchor, RopeLike } from './types';
import { rnd, clamp } from './util';

/* ============================================================
   EVIDENCE GEOMETRY
   ============================================================ */

/** Paper plane with a gentle vertical curl baked into the vertices. */
export function bentPaperGeo(
  w: number,
  h: number,
  curl: number,
): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h, 12, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / w + 0.5,
      v = p.getY(i) / h + 0.5;
    let z = Math.sin(u * Math.PI) * curl * 0.4;
    z +=
      Math.pow(Math.max(0, u - 0.75) * 4, 2) *
      Math.max(0, v - 0.7) *
      curl *
      2.2;
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Push-pin: colored sphere head + metal needle. `g.userData.head` = sphere. */
export function makePin(colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 20, 16),
    new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.35,
      roughness: 0.22,
      emissive: colorHex,
      emissiveIntensity: 0.04,
    }),
  );
  head.position.z = PIN_Z;
  head.castShadow = true;
  const needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.02, PIN_Z, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      metalness: 0.95,
      roughness: 0.18,
    }),
  );
  needle.rotation.x = Math.PI / 2;
  needle.position.z = PIN_Z / 2;
  needle.castShadow = true;
  g.add(head, needle);
  g.userData.head = head;
  return g;
}

/* ============================================================
   CAMERA RIG
   ============================================================ */

export interface CameraRig {
  tx: number;
  ty: number;
  x: number;
  y: number;
  tz: number;
  z: number;
  vx: number;
  vy: number;
  idle: number;
  apply(
    t: number,
    camera: THREE.PerspectiveCamera,
    lampTarget: THREE.Object3D,
  ): void;
  wake(): void;
}

/**
 * The eased-follow camera rig. `tx/ty/tz` are targets; `vx/vy` are fling
 * velocities that decay each apply() and clamp the target inside the board.
 * After ~2.5s of stillness a gentle "breathing" sway fades in.
 */
export function createRig(): CameraRig {
  return {
    tx: 0,
    ty: 1,
    x: 0,
    y: 1,
    tz: Z_HOME,
    z: Z_HOME,
    vx: 0,
    vy: 0,
    idle: 0,
    apply(t, camera, lampTarget) {
      this.x += (this.tx - this.x) * 0.12;
      this.y += (this.ty - this.y) * 0.12;
      this.z += (this.tz - this.z) * 0.1;
      if (this.vx || this.vy) {
        this.tx = clamp(
          this.tx + this.vx,
          -BOARD_W / 2 + 8,
          BOARD_W / 2 - 8,
        );
        this.ty = clamp(
          this.ty + this.vy,
          -BOARD_H / 2 + 6,
          BOARD_H / 2 - 6,
        );
        this.vx *= 0.92;
        this.vy *= 0.92;
        if (Math.abs(this.vx) < 0.001) this.vx = 0;
        if (Math.abs(this.vy) < 0.001) this.vy = 0;
      }
      this.idle += 1 / 60;
      const br = Math.min(1, Math.max(0, this.idle - 2.5)) * 0.6;
      const bx = Math.sin(t * 0.32) * br,
        by = Math.cos(t * 0.21) * br * 0.6,
        bz = Math.sin(t * 0.18) * br * 0.8;
      camera.position.set(this.x + 3.2 + bx, this.y + 2.1 + by, this.z + bz);
      camera.lookAt(this.x + bx * 0.6, this.y + by * 0.6, 0);
      lampTarget.position.set(this.x, this.y, 0);
    },
    wake() {
      this.idle = 0;
    },
  };
}

/* ---------- Screen ↔ board projection ----------
 * viewW/viewH are the drawing-buffer size of the canvas (which may not fill
 * the window). */
const raycaster = new THREE.Raycaster();
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _v = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _sv = new THREE.Vector3();

export function screenToBoard(
  camera: THREE.Camera,
  viewW: number,
  viewH: number,
  cx: number,
  cy: number,
  z = 0,
): THREE.Vector3 {
  _ndc.set((cx / viewW) * 2 - 1, -(cy / viewH) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  boardPlane.constant = -z;
  raycaster.ray.intersectPlane(boardPlane, _v);
  return _v.clone();
}

export function worldToScreen(
  camera: THREE.Camera,
  viewW: number,
  viewH: number,
  v: THREE.Vector3,
): { x: number; y: number } {
  _sv.copy(v).project(camera);
  return {
    x: ((_sv.x + 1) / 2) * viewW,
    y: ((1 - _sv.y) / 2) * viewH,
  };
}

/** Board coords → 2D canvas coords for minimap/graph painters. */
export function boardProjector(
  W: number,
  H: number,
  pad: number,
): { x(v: number): number; y(v: number): number } {
  return {
    x: (v) => pad + ((v + BOARD_W / 2) / BOARD_W) * (W - pad * 2),
    y: (v) => H - pad - ((v + BOARD_H / 2) / BOARD_H) * (H - pad * 2),
  };
}

/* ============================================================
   DUST MOTES
   ============================================================ */

/** Drifting dust particles. Caller adds `object` to the scene. */
export function createDust(): {
  object: THREE.Points;
  step(dt: number, t: number): void;
} {
  const N = 220,
    g = new THREE.BufferGeometry(),
    pos = new Float32Array(N * 3),
    spd: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-BOARD_W / 2, BOARD_W / 2);
    pos[i * 3 + 1] = rnd(-BOARD_H / 2, BOARD_H / 2);
    pos[i * 3 + 2] = rnd(2, 26);
    spd.push({ x: rnd(-0.12, 0.12), y: rnd(-0.06, 0.14), w: rnd(0.5, 2) });
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color: 0xffd9a6,
    size: 0.16,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const object = new THREE.Points(g, m);
  const arr = g.getAttribute('position').array as Float32Array;
  return {
    object,
    step(dt, t) {
      for (let i = 0; i < N; i++) {
        arr[i * 3] += spd[i].x * dt + Math.sin(t * spd[i].w + i) * 0.004;
        arr[i * 3 + 1] += spd[i].y * dt;
        if (arr[i * 3 + 1] > BOARD_H / 2) arr[i * 3 + 1] = -BOARD_H / 2;
        if (arr[i * 3] > BOARD_W / 2) arr[i * 3] = -BOARD_W / 2;
        if (arr[i * 3] < -BOARD_W / 2) arr[i * 3] = BOARD_W / 2;
      }
      g.getAttribute('position').needsUpdate = true;
    },
  };
}

/* ============================================================
   ROPES — anchored Verlet thread solver
   ============================================================ */

let ropeCtx: { scene: THREE.Scene; fiberTex?: THREE.Texture } | null = null;

/** Must be called once (with the board scene) before any Rope is built. */
export function initRopeContext(ctx: {
  scene: THREE.Scene;
  fiberTex?: THREE.Texture;
}): void {
  ropeCtx = ctx;
}

/**
 * Live rope registry — mirrors the reference module-level `ropes` array.
 * The world pushes each constructed Rope here (as `connect()` did) so that
 * kill() can splice it out once the fade completes.
 */
export const ropes: Rope[] = [];

const GRAV = -30,
  DAMP = 0.986,
  ITER = 5;
const _pa = new THREE.Vector3(),
  _pb = new THREE.Vector3();

/** Anchor pinned to an item's pin-head (world position). */
export function anchorOf(it: BoardItem): RopeAnchor {
  return {
    item: it,
    get: (v) =>
      (it.pin.userData.head as THREE.Object3D).getWorldPosition(v),
  };
}

/** Free-floating anchor that follows a mutable `pos` (e.g. the cursor). */
export function createCursorAnchor(): {
  item: null;
  pos: THREE.Vector3;
  get(v: THREE.Vector3): THREE.Vector3;
} {
  return {
    item: null,
    pos: new THREE.Vector3(),
    get(v) {
      return v.copy(this.pos);
    },
  };
}

export class Rope implements RopeLike {
  a: RopeAnchor;
  b: RopeAnchor;
  color: number;
  live: boolean;
  N = 46;
  pts: THREE.Vector3[] = [];
  prev: THREE.Vector3[] = [];
  slackF: number;
  baseLen: number;
  phase: number;
  dying: boolean;
  freeB: boolean;
  opacity: number;
  thick: number;
  // z model: real thread sags in y, not toward the cork. Each particle's z
  // tracks the chord between its endpoints, allowed to drop at most `drop`
  // below it — so the thread rises with whatever it's tied to, at any height.
  drop: number;
  zPull: number;
  zMin: number;
  grow: number;
  mat: THREE.MeshStandardMaterial;
  mesh: THREE.Mesh;
  meta: { label: string | null; confidence: number; created: number };
  private scene: THREE.Scene;

  constructor(
    a: RopeAnchor,
    b: RopeAnchor,
    color: number,
    opts: { live?: boolean; slack?: number; confidence?: number } = {},
  ) {
    if (!ropeCtx)
      throw new Error(
        'Rope: initRopeContext({ scene, fiberTex? }) must be called before constructing ropes',
      );
    this.scene = ropeCtx.scene;
    this.a = a;
    this.b = b;
    this.color = color;
    this.live = !!opts.live;
    this.slackF = opts.slack || rnd(1.1, 1.2);
    this.a.get(_pa);
    this.b.get(_pb);
    this.baseLen = this.live
      ? Math.max(_pa.distanceTo(_pb) * 1.05, 2)
      : Math.max(_pa.distanceTo(_pb) * this.slackF, 4);
    for (let i = 0; i < this.N; i++) {
      const p = _pa.clone().lerp(_pb, i / (this.N - 1));
      p.z += 0.15;
      this.pts.push(p);
      this.prev.push(p.clone());
    }
    this.phase = rnd(0, 6.28);
    this.dying = false;
    this.freeB = false;
    this.opacity = 1;
    this.thick = rnd(0.05, 0.062);
    this.drop = this.live ? 0.3 : 0.5;
    this.zPull = this.live ? 0.08 : 0.03;
    this.zMin = this.live ? 1.3 : 0.35;
    this.grow = this.live ? 1 : 0;
    this.mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0,
      bumpMap: ropeCtx.fiberTex ?? null,
      bumpScale: 0.028,
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.castShadow = true;
    if (this.live) this.mesh.renderOrder = 5;
    this.scene.add(this.mesh);
    if (this.a.item) this.a.item.ropes.push(this);
    if (this.b.item) this.b.item.ropes.push(this);
    this.meta = {
      label: null,
      confidence: opts.confidence != null ? opts.confidence : 0.78,
      created: Date.now(),
    };
    if (!this.live)
      gsap.to(this, { grow: 1, duration: 0.85, ease: 'power2.inOut' });
    this.syncVisible();
  }

  other(it: BoardItem): BoardItem | null {
    return this.a.item === it ? this.b.item : this.a.item;
  }

  tie(bItem: BoardItem): void {
    // the moment of tying off: trim the spool to a natural length
    this.b = anchorOf(bItem);
    bItem.ropes.push(this);
    this.live = false;
    this.a.get(_pa);
    this.b.get(_pb);
    const d = _pa.distanceTo(_pb);
    this.baseLen = clamp(this.baseLen, d * 1.06, d * 1.32);
    // let go: the held thread relaxes from carry tautness into its drape
    this.mesh.renderOrder = 0;
    gsap.to(this, {
      drop: 0.5,
      zPull: 0.03,
      zMin: 0.35,
      duration: 0.9,
      ease: 'power2.inOut',
    });
    this.syncVisible();
  }

  step(dt: number, t: number): void {
    const N = this.N,
      pts = this.pts,
      prev = this.prev,
      dt2 = dt * dt;
    this.a.get(_pa);
    this.b.get(_pb);
    if (this.grow < 1) _pb.lerpVectors(_pa, _pb, this.grow);
    const za = _pa.z,
      zb = _pb.z,
      drop = this.drop,
      zMin = this.zMin,
      zPull = this.zPull;
    for (let i = 0; i < N; i++) {
      const p = pts[i],
        q = prev[i];
      const vx = (p.x - q.x) * DAMP,
        vy = (p.y - q.y) * DAMP,
        vz = (p.z - q.z) * DAMP;
      q.copy(p);
      p.x += vx + Math.sin(t * 1.4 + this.phase + i * 0.4) * 0.0007; // breath of air
      p.y += vy + GRAV * dt2;
      const chord = za + (zb - za) * (i / (N - 1));
      p.z += vz + (chord - p.z) * zPull;
      const floor = Math.max(zMin, chord - drop);
      if (p.z < floor) p.z = floor;
      if (p.z > 5.5) p.z = 5.5;
    }
    if (this.live) {
      // spool feeds thread out as you pull away; slack stays when you come back
      const d = _pa.distanceTo(_pb);
      this.baseLen = Math.max(this.baseLen, d * 1.06);
    }
    if (!this.dying) {
      pts[0].copy(_pa);
      prev[0].copy(_pa);
    }
    if (!(this.dying && this.freeB)) {
      pts[N - 1].copy(_pb);
      prev[N - 1].copy(_pb);
    }
    const dist = _pa.distanceTo(_pb);
    const rest = Math.max(this.baseLen, dist * 1.02) / (N - 1);
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < N - 1; i++) {
        const p1 = pts[i],
          p2 = pts[i + 1];
        let dx = p2.x - p1.x,
          dy = p2.y - p1.y,
          dz = p2.z - p1.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
        const diff = ((d - rest) / d) * 0.5;
        dx *= diff;
        dy *= diff;
        dz *= diff;
        const w1 = i === 0 && !this.dying ? 0 : 1;
        const w2 = i === N - 2 && !(this.dying && this.freeB) ? 0 : 1;
        const tw = w1 + w2 || 1;
        p1.x += (dx * 2 * w1) / tw;
        p1.y += (dy * 2 * w1) / tw;
        p1.z += (dz * 2 * w1) / tw;
        p2.x -= (dx * 2 * w2) / tw;
        p2.y -= (dy * 2 * w2) / tw;
        p2.z -= (dz * 2 * w2) / tw;
      }
    }
  }

  render(): void {
    const smp: THREE.Vector3[] = [];
    for (let i = 0; i < this.N; i += 2) smp.push(this.pts[i]);
    if ((this.N - 1) % 2) smp.push(this.pts[this.N - 1]);
    const curve = new THREE.CatmullRomCurve3(smp);
    const old = this.mesh.geometry;
    this.mesh.geometry = new THREE.TubeGeometry(curve, 40, this.thick, 5, false);
    old.dispose();
    this.mat.opacity = this.opacity;
  }

  highlight(on: boolean): void {
    gsap.to(this.mat, {
      emissiveIntensity: on ? 0.55 : 0,
      duration: 0.3,
      overwrite: 'auto',
    });
  }

  hold(on: boolean): void {
    // an attached item is being lifted: tighten the thread against its chord
    // so it tracks the pin closely, then relax back into the drape on release
    if (this.live || this.dying) return;
    gsap.to(this, {
      drop: on ? 0.22 : 0.5,
      zPull: on ? 0.09 : 0.03,
      duration: on ? 0.2 : 0.9,
      ease: on ? 'power2.out' : 'power2.inOut',
      overwrite: 'auto',
    });
  }

  syncVisible(): void {
    const av = !this.a.item || this.a.item.grp.visible;
    const bv = !this.b.item || this.b.item.grp.visible;
    this.mesh.visible = av && bv;
  }

  detach(): void {
    [this.a.item, this.b.item].forEach((it) => {
      if (!it) return;
      const i = it.ropes.indexOf(this);
      if (i >= 0) it.ropes.splice(i, 1);
    });
  }

  kill(): void {
    this.dying = true;
    this.freeB = true;
    this.mesh.renderOrder = 0;
    gsap.to(this, {
      drop: 1.6,
      zMin: 0.35,
      zPull: 0.02,
      duration: 0.45,
      ease: 'power2.in',
    });
    gsap.to(this, {
      opacity: 0,
      duration: 0.9,
      delay: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mat.dispose();
        const i = ropes.indexOf(this);
        if (i >= 0) ropes.splice(i, 1);
      },
    });
  }
}

/* ============================================================
   MISC
   ============================================================ */

/** Ray-cast point-in-polygon (screen-space lasso hit test). */
export function pointInPoly(
  pt: { x: number; y: number },
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y,
      xj = poly[j].x,
      yj = poly[j].y;
    if (
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
