/**
 * world.ts — the encapsulated Three.js corkboard world for the Casebook board.
 *
 * Port of the reference single-file engine (index.html):
 *   STAGE 1495–1513, buildBoard 1515–1587, lights 1589–1604, dust,
 *   CAMERA RIG 1648–1724 (geometry.ts), EVIDENCE 1729–1885,
 *   Create factory 2630–2775, Rope solver 2777–3054 (geometry.ts),
 *   deleteItem 3091–3115, SELECTION 3153–3182, TOOLS+INTERACTION 3321–3685,
 *   lasso 3687–3741, filters 3973–3986, minimap 4103–4176, zoom 4178–4185,
 *   MAIN LOOP 4388–4431.
 *
 * Adapted to:
 *   - three r185 (`outputColorSpace = SRGBColorSpace`, not outputEncoding)
 *   - a stage-sized viewport: every screen↔board conversion uses
 *     stage.getBoundingClientRect(), never innerWidth/innerHeight
 *   - an external data store: items/ropes are projected via
 *     upsertItem()/syncRopes() instead of internal Create + History + seed
 *     state. The world owns ONLY rendering + interaction; mutations are
 *     requested through WorldHooks.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { BoardCardType } from '@/lib/types/investigation';
import {
  BOARD_W,
  BOARD_H,
  PAPER_Z,
  Z_HOME,
  PIN_COLORS,
  THREAD_COLOR_HEX,
  TYPE_TAGS,
  type BoardItem,
  type BoardTool,
  type ItemSpec,
  type RopeAnchor,
  type RopeLike,
  type RopeSpec,
  type WorldApi,
  type WorldHooks,
} from './types';
import { rnd, clamp } from './util';
import { specSignature } from './spec';
import { toTex, cork, corkBump, wood, fiber } from './textures';
import {
  photoCanvas,
  suspectCanvas,
  stickyCanvas,
  docCanvas,
  newsCanvas,
} from './artA';
import {
  printCanvas,
  mapCanvas,
  statementCanvas,
  bagCanvas,
  keyCanvas,
  planCanvas,
} from './artB';
import {
  bentPaperGeo,
  makePin,
  Rope,
  initRopeContext,
  clearRopeContext,
  anchorOf,
  createCursorAnchor,
  screenToBoard,
  worldToScreen,
  pointInPoly,
  createRig,
  boardProjector,
  createDust,
} from './geometry';

/** Card size + paper curl per type — exact values from the Create factory. */
const CARD: Record<BoardCardType, { w: number; h: number; curl: number }> = {
  photo: { w: 9, h: 10.5, curl: 0.3 },
  suspect: { w: 8.4, h: 11, curl: 0.2 },
  sticky: { w: 6.4, h: 6.4, curl: 0.55 },
  doc: { w: 8.6, h: 11.6, curl: 0.22 },
  news: { w: 10, h: 11.8, curl: 0.34 },
  print: { w: 8.4, h: 10.4, curl: 0.18 },
  map: { w: 9.6, h: 9.6, curl: 0.24 },
  statement: { w: 8.2, h: 10, curl: 0.26 },
  bag: { w: 7.8, h: 10.2, curl: 0.14 },
  key: { w: 5.4, h: 7.2, curl: 0.05 },
  plan: { w: 8.8, h: 10.2, curl: 0.2 },
};

const SUBSTEPS = 3;
/** Pending (tied, un-keyed) ropes the store never confirmed die after this. */
const PENDING_TTL = 3000;
const STICKY_TINTS = ['y', 'p', 'g', 'b'] as const;

const CONNECT_HINT =
  '<b>click a pin</b> to anchor a thread — it will follow your cursor';
const DEFAULT_HINT =
  'drag the board to pan · scroll to zoom · <b>C</b> to string a thread';

type CursorAnchor = RopeAnchor & { pos: THREE.Vector3 };

export function createWorld(opts: {
  stage: HTMLCanvasElement;
  lassoCanvas: HTMLCanvasElement;
  rootEl: HTMLElement;
  hooks: WorldHooks;
}): WorldApi {
  const { stage, lassoCanvas: lassoCv, rootEl, hooks } = opts;

  /* ============================================================
     STAGE
     ============================================================ */
  const renderer = new THREE.WebGLRenderer({ canvas: stage, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0a09);
  scene.fog = new THREE.Fog(0x0c0a09, 120, 300);

  function buildBoard() {
    const corkMat = new THREE.MeshStandardMaterial({
      map: cork(),
      bumpMap: corkBump(),
      bumpScale: 0.06,
      roughness: 0.95,
      metalness: 0,
    });
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W, BOARD_H, 1.4),
      corkMat,
    );
    board.position.z = -0.7;
    board.receiveShadow = true;
    scene.add(board);
    const woodMat = new THREE.MeshStandardMaterial({
      map: wood(),
      roughness: 0.62,
      metalness: 0.08,
    });
    const T = 3.4,
      D = 3.0;
    const mk = (w: number, h: number, px: number, py: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), woodMat);
      m.position.set(px, py, -0.4);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      const bev = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.98, h * 0.35, D * 0.2),
        new THREE.MeshStandardMaterial({ color: 0x6a4c2a, roughness: 0.5 }),
      );
      bev.position.set(px, py, D * 0.42);
      scene.add(bev);
    };
    mk(BOARD_W + T * 2, T, 0, BOARD_H / 2 + T / 2);
    mk(BOARD_W + T * 2, T, 0, -BOARD_H / 2 - T / 2);
    mk(T, BOARD_H, -BOARD_W / 2 - T / 2, 0);
    mk(T, BOARD_H, BOARD_W / 2 + T / 2, 0);
    const brass = new THREE.MeshStandardMaterial({
      color: 0xa8823c,
      metalness: 0.85,
      roughness: 0.35,
    });
    (
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const
    ).forEach(([sx, sy]) => {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.5, 6),
        brass,
      );
      p.rotation.x = Math.PI / 2;
      p.position.set(
        sx * (BOARD_W / 2 + T / 2),
        sy * (BOARD_H / 2 + T / 2),
        D * 0.55,
      );
      p.castShadow = true;
      scene.add(p);
    });
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 400),
      new THREE.MeshStandardMaterial({ color: 0x18201c, roughness: 1 }),
    );
    wall.position.z = -4;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  buildBoard();

  scene.add(new THREE.AmbientLight(0x8a7055, 4));
  const lamp = new THREE.SpotLight(0xffd6a0, 7, 460, 1.05, 0.55, 1.2);
  lamp.position.set(-38, 58, 80);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.00035;
  lamp.shadow.camera.near = 20;
  lamp.shadow.camera.far = 280;
  scene.add(lamp);
  scene.add(lamp.target);
  const fillL = new THREE.DirectionalLight(0x9fb4cc, 1.1);
  fillL.position.set(40, -10, 60);
  scene.add(fillL);
  const rimL = new THREE.PointLight(0xffb066, 2.2, 140);
  rimL.position.set(42, 32, 26);
  scene.add(rimL);

  const dust = createDust();
  scene.add(dust.object);

  /* ---------- camera + rig ---------- */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 700);
  const rig = createRig();
  const raycaster = new THREE.Raycaster();
  const _ndc = new THREE.Vector2();

  function viewRect() {
    return stage.getBoundingClientRect();
  }
  /** client coords → board-plane (z) intersection, in world units. */
  function boardPoint(clientX: number, clientY: number, z = 0): THREE.Vector3 {
    const r = viewRect();
    return screenToBoard(
      camera,
      r.width,
      r.height,
      clientX - r.left,
      clientY - r.top,
      z,
    );
  }
  function cursorToRopeSpace(e: { clientX: number; clientY: number }) {
    const p = boardPoint(e.clientX, e.clientY, 1.75);
    p.z = 1.75;
    return p;
  }

  /* ============================================================
     EVIDENCE
     ============================================================ */
  const items: BoardItem[] = [];
  const itemById = new Map<string, BoardItem>();
  const hitMeshes: THREE.Object3D[] = [];
  /** last painted specSignature per item id — repaint only when it changes */
  const sigByItem = new Map<string, string>();
  const thumbnailByItem = new Map<string, string>();
  /** loaded photo images (spec.imageUrl → HTMLImageElement) per item id */
  const imgByItem = new Map<string, HTMLImageElement>();
  const imgLoading = new Set<string>();
  /** resolved sticky tint per item id (sticky picks a random tint once) */
  const tintByItem = new Map<string, string>();
  const filterState: Record<string, boolean> = {};

  function pinHead(it: BoardItem): THREE.Mesh {
    return it.pin.userData.head as THREE.Mesh;
  }
  function pinHeadMat(it: BoardItem): THREE.MeshStandardMaterial {
    return pinHead(it).material as THREE.MeshStandardMaterial;
  }

  /** Painter dispatch by spec.type — mirrors the Create factory defaults. */
  function paintSpec(spec: ItemSpec): HTMLCanvasElement {
    const img = spec.img || imgByItem.get(spec.id) || null;
    switch (spec.type) {
      case 'photo':
        return photoCanvas(img, spec.text || 'evidence photo', spec.style);
      case 'suspect':
        return suspectCanvas(
          spec.title || 'UNKNOWN',
          spec.text || '',
          spec.role,
          spec.gender,
        );
      case 'sticky': {
        let tint = spec.tint || tintByItem.get(spec.id);
        if (!tint) {
          tint = STICKY_TINTS[(Math.random() * 4) | 0] ?? 'y';
          tintByItem.set(spec.id, tint);
        }
        return stickyCanvas(spec.text || 'new lead?', tint);
      }
      case 'doc':
        return docCanvas(spec.title || 'Incident report', spec.text || '');
      case 'news':
        return newsCanvas(spec.text || 'Headline', spec.paper, spec.chart);
      case 'print':
        return printCanvas(spec.text || 'F-12 · #6-211');
      case 'map':
        return mapCanvas(spec.text || 'Downtown District');
      case 'statement':
        return statementCanvas(spec.text || '', spec.sig);
      case 'bag':
        return bagCanvas(
          spec.title || '14-8397',
          spec.date || '10/12/23',
          spec.text || '',
        );
      case 'key':
        return keyCanvas(spec.title || '4B');
      case 'plan':
        return planCanvas();
    }
  }

  function applyFilterTo(it: BoardItem) {
    it.grp.visible = filterState[it.type] !== false;
    it.ropes.forEach((r) => r.syncVisible());
  }

  function buildItem(spec: ItemSpec): BoardItem {
    const card = CARD[spec.type];
    const w = card.w,
      h = card.h;
    const cv = paintSpec(spec);
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      map: toTex(cv),
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const paper = new THREE.Mesh(
      bentPaperGeo(w, h, spec.curl != null ? spec.curl : card.curl),
      mat,
    );
    paper.castShadow = true;
    paper.receiveShadow = true;
    grp.add(paper);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 1.4, h + 1.4),
      new THREE.MeshBasicMaterial({
        color: 0xe13c32,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.z = -0.09;
    grp.add(glow);
    const pin = makePin(PIN_COLORS[spec.type] ?? 0xb01722);
    pin.position.set(0, h / 2 - 0.7, 0.12);
    grp.add(pin);
    grp.position.set(
      Number.isFinite(spec.x) ? spec.x : 0,
      Number.isFinite(spec.y) ? spec.y : 0,
      PAPER_Z,
    );
    grp.rotation.z =
      spec.rot != null && Number.isFinite(spec.rot) ? spec.rot : rnd(-0.05, 0.05);

    const it: BoardItem = {
      id: spec.id, // entity id — NOT uid()
      type: spec.type,
      grp,
      paper,
      glow,
      pin,
      w,
      h,
      canvas: cv,
      spec,
      text: spec.text || '',
      title: spec.title || '',
      ropes: [],
      baseZ: PAPER_Z + rnd(0, 0.06),
      hoverLift: 0,
      dragLift: 0,
      target: new THREE.Vector3().copy(grp.position),
      vel: new THREE.Vector2(),
      restRot: grp.rotation.z,
      meta: {
        created: spec.created || Date.now(),
        by: spec.by || 'Investigator',
        tags: (spec.tags || TYPE_TAGS[spec.type] || []).slice(),
        notes: [],
      },
    };
    grp.userData.item = it;
    paper.userData.item = it;
    pinHead(it).userData.item = it;
    scene.add(grp);
    items.push(it);
    itemById.set(it.id, it);
    hitMeshes.push(paper, pinHead(it));
    grp.scale.setScalar(0.6);
    gsap.to(grp.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.6,
      ease: 'back.out(1.7)',
    });
    it.dragLift = 5;
    grp.position.z = PAPER_Z + 5;
    gsap.to(it, { dragLift: 0, duration: 0.7, ease: 'power3.out' });
    applyFilterTo(it);
    return it;
  }

  function swapMap(it: BoardItem, cv: HTMLCanvasElement) {
    const m = it.paper.material as THREE.MeshStandardMaterial;
    if (m.map) m.map.dispose();
    it.canvas = cv;
    thumbnailByItem.delete(it.id);
    m.map = toTex(cv);
    m.needsUpdate = true;
  }

  /** Kick off an async image load for spec.imageUrl; repaints on arrival. */
  function ensureImage(spec: ItemSpec) {
    if (!spec.imageUrl || imgByItem.has(spec.id) || imgLoading.has(spec.id))
      return;
    imgLoading.add(spec.id);
    const im = new Image();
    im.onload = () => {
      imgLoading.delete(spec.id);
      imgByItem.set(spec.id, im);
      const it = itemById.get(spec.id);
      if (it && it.type === 'photo') swapMap(it, paintSpec(it.spec));
    };
    im.src = spec.imageUrl;
  }

  function disposeItemResources(it: BoardItem) {
    const paperMat = it.paper.material as THREE.MeshStandardMaterial;
    paperMat.map?.dispose();
    paperMat.dispose();
    it.paper.geometry.dispose();
    (it.glow.material as THREE.Material).dispose();
    it.glow.geometry.dispose();
    it.pin.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
  }

  function removeItemMesh(it: BoardItem) {
    scene.remove(it.grp);
    const i = items.indexOf(it);
    if (i >= 0) items.splice(i, 1);
    [it.paper, pinHead(it)].forEach((m) => {
      const j = hitMeshes.indexOf(m);
      if (j >= 0) hitMeshes.splice(j, 1);
    });
    sel.delete(it);
    disposeItemResources(it);
  }

  /* ============================================================
     ROPES — keyed by relationship id + un-keyed pending ties
     ============================================================ */
  const fiberTex = fiber();
  initRopeContext({ scene, fiberTex });
  const ropes: Rope[] = [];
  /** relationship id → rope */
  const keyedRopes = new Map<string, Rope>();
  /** rope → relationship id */
  const ropeKeyOf = new Map<Rope, string>();
  /** tied-but-unconfirmed rope → tie timestamp (for PENDING_TTL reaping) */
  const pendingSince = new Map<Rope, number>();
  const cursorAnchor = createCursorAnchor() as CursorAnchor;
  let liveRope: Rope | null = null;
  let threadColor: number = THREAD_COLOR_HEX.crimson;

  function recolorRope(r: RopeLike, colorHex: number) {
    r.color = colorHex;
    const m = r.mesh.material as THREE.MeshStandardMaterial;
    m.color.setHex(colorHex);
    m.emissive.setHex(colorHex);
  }

  function forgetRope(r: Rope) {
    const k = ropeKeyOf.get(r);
    if (k != null) {
      ropeKeyOf.delete(r);
      keyedRopes.delete(k);
    }
    pendingSince.delete(r);
    if (liveRope === r) liveRope = null;
  }

  function syncRopes(specs: RopeSpec[]) {
    const seen = new Set<string>();
    const match = (r: Rope, s: RopeSpec) => {
      const a = r.a.item?.id,
        b = r.b.item?.id;
      return (
        (a === s.sourceId && b === s.targetId) ||
        (a === s.targetId && b === s.sourceId)
      );
    };
    for (const s of specs) {
      seen.add(s.id);
      let cur = keyedRopes.get(s.id);
      if (cur && cur.dying) {
        keyedRopes.delete(s.id);
        ropeKeyOf.delete(cur);
        cur = undefined;
      }
      if (cur) {
        if (cur.color !== s.colorHex) recolorRope(cur, s.colorHex);
        cur.meta.confidence = s.confidence;
        continue;
      }
      // adopt a pending tied rope whose endpoints match (unordered)
      const pend = ropes.find(
        (r) => !r.live && !r.dying && !ropeKeyOf.has(r) && match(r, s),
      );
      let r = pend;
      if (r) {
        pendingSince.delete(r);
        if (r.color !== s.colorHex) recolorRope(r, s.colorHex);
        r.meta.confidence = s.confidence;
      } else {
        const aIt = itemById.get(s.sourceId),
          bIt = itemById.get(s.targetId);
        if (!aIt || !bIt) continue;
        r = new Rope(anchorOf(aIt), anchorOf(bIt), s.colorHex, {
          confidence: s.confidence,
        });
        ropes.push(r);
      }
      keyedRopes.set(s.id, r);
      ropeKeyOf.set(r, s.id);
    }
    // keyed ropes that vanished from the spec set die
    for (const [id, r] of [...keyedRopes]) {
      if (!seen.has(id)) {
        keyedRopes.delete(id);
        ropeKeyOf.delete(r);
        r.detach();
        r.kill();
      }
    }
    // stale pending ties (store never confirmed) die after ~3s
    const now = Date.now();
    for (const r of ropes.slice()) {
      if (r.live || r.dying || ropeKeyOf.has(r)) continue;
      const since = pendingSince.get(r) ?? r.meta.created;
      if (now - since > PENDING_TTL) {
        pendingSince.delete(r);
        r.detach();
        r.kill();
      }
    }
    // hide ropes whose endpoint items are gone/hidden
    for (const r of ropes) {
      r.syncVisible();
      if (
        r.mesh.visible &&
        ((r.a.item && !items.includes(r.a.item)) ||
          (r.b.item && !items.includes(r.b.item)))
      )
        r.mesh.visible = false;
    }
  }

  /* ============================================================
     SELECTION (multi)
     ============================================================ */
  const sel = new Set<BoardItem>();
  let primary: BoardItem | null = null;

  function notifySel() {
    hooks.onSelect(
      [...sel].map((i) => i.id),
      primary ? primary.id : null,
    );
  }
  function setGlow(it: BoardItem, on: boolean) {
    gsap.to(it.glow.material as THREE.MeshBasicMaterial, {
      opacity: on ? 0.4 : 0,
      duration: 0.25,
    });
    it.ropes.forEach((r) => r.highlight(on));
  }
  function clearSel(notify = true) {
    sel.forEach((it) => setGlow(it, false));
    sel.clear();
    primary = null;
    if (notify) notifySel();
  }
  function selectOnly(it: BoardItem | null, notify = true) {
    clearSel(false);
    if (it) {
      sel.add(it);
      primary = it;
      setGlow(it, true);
    }
    if (notify) notifySel();
  }
  function selectMany(arr: BoardItem[], notify = true) {
    clearSel(false);
    arr.forEach((it) => {
      sel.add(it);
      setGlow(it, true);
    });
    primary = arr[arr.length - 1] || null;
    if (notify) notifySel();
  }

  /* ============================================================
     TOOLS + INTERACTION
     ============================================================ */
  let TOOL: BoardTool = 'select';
  let hovered: BoardItem | null = null;
  let dragging: BoardItem | null = null;
  let panning = false;
  let lassoPath: { x: number; y: number }[] | null = null;
  let px = 0,
    py = 0,
    downX = 0,
    downY = 0,
    moved = false;
  const grabOff = new THREE.Vector3();
  let dragStarts: { it: BoardItem; from: THREE.Vector3 }[] | null = null;

  function setTool(t: BoardTool) {
    if (liveRope) cancelLiveRope();
    TOOL = t;
    stage.classList.toggle('connecting', t === 'connect');
    stage.classList.toggle('lasso', t === 'lasso');
    hooks.onHint(
      t === 'connect' ? CONNECT_HINT : t === 'lasso' ? 'drag to lasso items' : DEFAULT_HINT,
    );
  }

  function pick(e: { clientX: number; clientY: number }): BoardItem | null {
    const r = viewRect();
    if (!r.width || !r.height) return null;
    _ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(_ndc, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    for (const h of hits) {
      const it = h.object.userData.item as BoardItem | undefined;
      if (it && it.grp.visible) return it;
    }
    return null;
  }

  function cancelLiveRope() {
    if (!liveRope) return;
    const r = liveRope;
    liveRope = null;
    r.detach();
    r.kill();
    hooks.onHint(CONNECT_HINT);
  }

  function pinElastic(it: BoardItem) {
    gsap.fromTo(
      pinHead(it).scale,
      { x: 1.6, y: 1.6, z: 1.6 },
      { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1,.4)' },
    );
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button === 2) return;
    rig.wake();
    moved = false;
    downX = px = e.clientX;
    downY = py = e.clientY;
    const it = pick(e);

    if (TOOL === 'connect') {
      if (liveRope) {
        if (it && it !== liveRope.a.item) {
          // tie off — keep the rope as a pending tie until the store
          // confirms via syncRopes (which adopts it by endpoint match)
          liveRope.tie(it);
          const r = liveRope;
          liveRope = null;
          pendingSince.set(r, Date.now());
          pinElastic(it);
          const aId = r.a.item ? r.a.item.id : null;
          if (aId) hooks.onRequestConnect(aId, it.id);
          hooks.onHint(
            'thread tied · anchor another, or press <b>V</b> for select',
          );
        } else if (!it) {
          cancelLiveRope();
        }
        return;
      }
      if (it) {
        cursorAnchor.pos.copy(cursorToRopeSpace(e));
        liveRope = new Rope(anchorOf(it), cursorAnchor, threadColor, {
          live: true,
        });
        ropes.push(liveRope);
        pinElastic(it);
        hooks.onHint(
          'carrying thread — <b>click another pin</b> to tie · click empty cork or Esc to drop it',
        );
      }
      return;
    }

    if (TOOL === 'lasso') {
      const r = viewRect();
      lassoPath = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
      return;
    }

    if (it && TOOL === 'select') {
      dragging = it;
      // group drag if part of multi-selection
      const group = sel.has(it) && sel.size > 1 ? [...sel] : [it];
      dragStarts = group.map((g) => ({ it: g, from: g.target.clone() }));
      const bp = boardPoint(e.clientX, e.clientY);
      grabOff.subVectors(it.grp.position, bp);
      grabOff.z = 0;
      group.forEach((g) => {
        g.dragLift = 1.15;
        g.ropes.forEach((r) => r.hold(true));
      });
      stage.classList.add('dragging');
    } else {
      // 'pan' tool lands here even when starting on a card
      panning = true;
      stage.classList.add('dragging');
      rig.vx = 0;
      rig.vy = 0;
    }
  }

  function onPointerMove(e: PointerEvent) {
    const dx = e.clientX - px,
      dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4)
      moved = true;

    if (liveRope) cursorAnchor.pos.copy(cursorToRopeSpace(e));

    if (lassoPath) {
      const r = viewRect();
      lassoPath.push({ x: e.clientX - r.left, y: e.clientY - r.top });
      drawLasso();
      return;
    }

    if (dragging && dragStarts) {
      rig.wake();
      const bp = boardPoint(e.clientX, e.clientY);
      const nx = clamp(
        bp.x + grabOff.x,
        -BOARD_W / 2 + 3,
        BOARD_W / 2 - 3,
      );
      const ny = clamp(
        bp.y + grabOff.y,
        -BOARD_H / 2 + 3,
        BOARD_H / 2 - 3,
      );
      const ddx = nx - dragging.target.x,
        ddy = ny - dragging.target.y;
      dragStarts.forEach(({ it: g }) => {
        g.target.x = clamp(
          g.target.x + ddx,
          -BOARD_W / 2 + 3,
          BOARD_W / 2 - 3,
        );
        g.target.y = clamp(
          g.target.y + ddy,
          -BOARD_H / 2 + 3,
          BOARD_H / 2 - 3,
        );
      });
      return;
    }
    if (panning) {
      rig.wake();
      const s = rig.z / 620;
      rig.tx = clamp(rig.tx - dx * s, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
      rig.ty = clamp(rig.ty + dy * s, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
      rig.vx = -dx * s * 0.9;
      rig.vy = dy * s * 0.9;
      return;
    }
    const it = pick(e);
    if (it !== hovered) {
      if (hovered) {
        hovered.hoverLift = 0;
        gsap.to(hovered.paper.scale, { x: 1, y: 1, duration: 0.3 });
        gsap.to(pinHeadMat(hovered), {
          emissiveIntensity: 0.04,
          duration: 0.3,
        });
      }
      hovered = it;
      if (it) {
        it.hoverLift = 0.55;
        gsap.to(it.paper.scale, {
          x: 1.025,
          y: 1.025,
          duration: 0.3,
          ease: 'power2.out',
        });
        gsap.to(pinHeadMat(it), { emissiveIntensity: 0.4, duration: 0.3 });
      }
    }
    stage.classList.toggle('item', !!it && TOOL === 'select');
  }

  function onPointerUp() {
    stage.classList.remove('dragging');
    if (lassoPath) {
      finishLasso();
      return;
    }
    if (dragging && dragStarts) {
      const starts = dragStarts;
      dragging = null;
      dragStarts = null;
      starts.forEach(({ it: g }) => {
        g.dragLift = 0;
        g.ropes.forEach((r) => r.hold(false));
      });
      if (!moved) {
        if (starts[0]) selectOnly(starts[0].it);
      } else {
        const recs = starts
          .map(({ it: g, from }) => ({
            it: g,
            from,
            to: g.target.clone(),
          }))
          .filter((r) => r.from.distanceTo(r.to) > 0.5);
        if (recs.length)
          hooks.onCommitPositions(
            recs.map((r) => ({ id: r.it.id, x: r.to.x, y: r.to.y })),
          );
      }
      return;
    }
    if (panning) {
      panning = false;
      return;
    }
    if (!moved && TOOL === 'select') clearSel();
  }

  function onContextMenu(e: Event) {
    e.preventDefault();
    cancelLiveRope();
  }

  function onDblClick(e: MouseEvent) {
    const it = pick(e);
    if (it && it.spec.editable) hooks.onEditItem(it.id);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    rig.wake();
    const before = boardPoint(e.clientX, e.clientY);
    rig.tz = clamp(rig.tz * (e.deltaY > 0 ? 1.09 : 0.92), 16, 120);
    const k = e.deltaY > 0 ? -0.06 : 0.08;
    rig.tx = clamp(
      rig.tx + (before.x - rig.tx) * k,
      -BOARD_W / 2 + 8,
      BOARD_W / 2 - 8,
    );
    rig.ty = clamp(
      rig.ty + (before.y - rig.ty) * k,
      -BOARD_H / 2 + 6,
      BOARD_H / 2 - 6,
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (
      rootEl.querySelector('.cb-scope #editor.open, #editor.open') ||
      (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))
    )
      return;
    // Tool keys (V/L/C/Space) live in the app shell — the store owns the tool.
    if (e.key === 'Escape') {
      cancelLiveRope();
      clearSel();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel.size) {
      // store owns the data — it will call removeItem() per entity
      hooks.onRequestDelete([...sel].map((i) => i.id));
      clearSel();
    }
  }

  /* ---------------- lasso ---------------- */
  const lassoCtx = lassoCv.getContext('2d');
  function sizeLasso() {
    const r = viewRect();
    lassoCv.width = Math.max(1, Math.round(r.width));
    lassoCv.height = Math.max(1, Math.round(r.height));
  }
  function drawLasso() {
    if (!lassoCtx) return;
    lassoCtx.clearRect(0, 0, lassoCv.width, lassoCv.height);
    if (!lassoPath || lassoPath.length < 2) return;
    lassoCtx.strokeStyle = 'rgba(225,60,50,.9)';
    lassoCtx.fillStyle = 'rgba(225,60,50,.08)';
    lassoCtx.lineWidth = 1.5;
    lassoCtx.setLineDash([6, 5]);
    lassoCtx.beginPath();
    lassoCtx.moveTo(lassoPath[0]!.x, lassoPath[0]!.y);
    for (const p of lassoPath) lassoCtx.lineTo(p.x, p.y);
    lassoCtx.closePath();
    lassoCtx.stroke();
    lassoCtx.fill();
  }
  function finishLasso() {
    const path = lassoPath;
    lassoPath = null;
    lassoCtx?.clearRect(0, 0, lassoCv.width, lassoCv.height);
    if (!path || path.length < 6) return;
    const r = viewRect();
    const hits = items.filter(
      (it) =>
        it.grp.visible &&
        pointInPoly(
          worldToScreen(camera, r.width, r.height, it.grp.position),
          path,
        ),
    );
    if (hits.length) {
      selectMany(hits);
      setTool('select');
      hooks.onToolRequest?.('select');
      hooks.onHint(
        `<b>${hits.length}</b> item${hits.length > 1 ? 's' : ''} selected — drag one to move the group`,
      );
    }
  }

  /* ============================================================
     MINIMAP — lazily resolved inside rootEl (#minimap canvas)
     ============================================================ */
  let mm: HTMLCanvasElement | null = null;
  let mmx: CanvasRenderingContext2D | null = null;
  let mmMoveH: ((e: PointerEvent) => void) | null = null;
  let mmUpH: (() => void) | null = null;

  function mmJump(e: PointerEvent) {
    if (!mm) return;
    const r = mm.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width,
      v = (e.clientY - r.top) / r.height;
    rig.tx = clamp((u - 0.5) * BOARD_W, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
    rig.ty = clamp((0.5 - v) * BOARD_H, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
    rig.wake();
  }
  function onMmDown(e: PointerEvent) {
    mmJump(e);
    mmMoveH = (ev: PointerEvent) => mmJump(ev);
    mmUpH = () => {
      if (mmMoveH) window.removeEventListener('pointermove', mmMoveH);
      if (mmUpH) window.removeEventListener('pointerup', mmUpH);
      mmMoveH = null;
      mmUpH = null;
    };
    window.addEventListener('pointermove', mmMoveH);
    window.addEventListener('pointerup', mmUpH);
  }
  function findMinimap() {
    if (mm && !mm.isConnected) {
      mm = null;
      mmx = null;
    }
    if (mm) return;
    const el = rootEl.querySelector('#minimap');
    if (el instanceof HTMLCanvasElement) {
      mm = el;
      mmx = mm.getContext('2d');
      mm.addEventListener('pointerdown', onMmDown);
    }
  }

  function drawMinimap() {
    if (!mm) findMinimap();
    if (!mm || !mmx) return;
    const W = mm.width,
      H = mm.height;
    const x = mmx;
    x.fillStyle = '#080606';
    x.fillRect(0, 0, W, H);
    const pad = 6;
    const proj = boardProjector(W, H, pad);
    x.strokeStyle = '#2a2522';
    x.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    ropes.forEach((rp) => {
      if (!rp.a.item || !rp.b.item || rp.dying || !rp.mesh.visible) return;
      x.strokeStyle = 'rgba(225,60,50,.5)';
      x.lineWidth = 1;
      const a = rp.a.item.grp.position,
        b = rp.b.item.grp.position;
      x.beginPath();
      x.moveTo(proj.x(a.x), proj.y(a.y));
      x.lineTo(proj.x(b.x), proj.y(b.y));
      x.stroke();
    });
    items.forEach((it) => {
      if (!it.grp.visible) return;
      x.fillStyle = sel.has(it) ? '#fff' : '#c9a76a';
      x.fillRect(
        proj.x(it.grp.position.x) - 1.5,
        proj.y(it.grp.position.y) - 1.5,
        3,
        3,
      );
    });
    // viewport rect
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * rig.z;
    const halfW = halfH * camera.aspect;
    x.strokeStyle = 'rgba(255,255,255,.6)';
    x.lineWidth = 1;
    x.strokeRect(
      proj.x(rig.tx - halfW),
      proj.y(rig.ty + halfH),
      ((halfW * 2) / BOARD_W) * (W - pad * 2),
      ((halfH * 2) / BOARD_H) * (H - pad * 2),
    );
  }

  /* ============================================================
     RESIZE
     ============================================================ */
  function resize() {
    const r = viewRect();
    const w = Math.max(1, Math.round(r.width)),
      h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false); // CSS owns the box; we own the buffer
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sizeLasso();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  /* ============================================================
     ITEM LIFECYCLE (store → world)
     ============================================================ */
  function upsertItem(spec: ItemSpec) {
    ensureImage(spec);
    const sig = specSignature(spec);
    const it = itemById.get(spec.id);
    if (it) {
      it.spec = spec;
      it.text = spec.text || '';
      it.title = spec.title || '';
      if (spec.tags) it.meta.tags = spec.tags.slice();
      if (spec.by) it.meta.by = spec.by;
      if (sigByItem.get(spec.id) !== sig) {
        sigByItem.set(spec.id, sig);
        swapMap(it, paintSpec(spec));
      }
      // store → world position sync (skip while the user is dragging it)
      const beingDragged =
        !!dragStarts && dragStarts.some((d) => d.it === it);
      if (!beingDragged) {
        if (Number.isFinite(spec.x)) it.target.x = spec.x;
        if (Number.isFinite(spec.y)) it.target.y = spec.y;
        if (spec.rot != null && Number.isFinite(spec.rot))
          it.restRot = spec.rot;
      }
      applyFilterTo(it);
      return;
    }
    sigByItem.set(spec.id, sig);
    buildItem(spec);
  }

  function removeItem(id: string) {
    const it = itemById.get(id);
    if (!it) return;
    itemById.delete(id);
    sigByItem.delete(id);
    thumbnailByItem.delete(id);
    imgByItem.delete(id);
    imgLoading.delete(id);
    tintByItem.delete(id);
    // detach + kill its ropes (their keyed map entries go too,
    // so syncRopes won't resurrect them)
    it.ropes.slice().forEach((r) => {
      const rr = r as Rope;
      forgetRope(rr);
      rr.detach();
      rr.kill();
    });
    if (hovered === it) hovered = null;
    if (dragging === it) {
      dragging = null;
      dragStarts = null;
    }
    sel.delete(it);
    if (primary === it) primary = null;
    gsap.to(it.grp.rotation, {
      z: it.grp.rotation.z + rnd(-0.6, 0.6),
      duration: 0.55,
      ease: 'power2.in',
    });
    gsap.to(it.grp.position, {
      y: it.grp.position.y - 7,
      z: 3,
      duration: 0.55,
      ease: 'power2.in',
    });
    gsap.to(it.grp.scale, {
      x: 0.4,
      y: 0.4,
      z: 0.4,
      duration: 0.55,
      ease: 'power2.in',
      onComplete: () => removeItemMesh(it),
    });
  }

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  const clock = new THREE.Timer();
  let frameN = 0,
    lastPct = 0,
    paused = false,
    rafId = 0;

  function scheduleFrame() {
    if (rafId || paused || document.hidden) return;
    rafId = requestAnimationFrame(frame);
  }

  function frame() {
    rafId = 0;
    if (paused || document.hidden) return;
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.033);
    const t = clock.getElapsed();

    for (const it of items) {
      const g = it.grp;
      it.target.z = it.baseZ + it.hoverLift + it.dragLift;
      const ox = g.position.x;
      g.position.lerp(it.target, 0.2);
      const vx = g.position.x - ox;
      it.vel.x += (vx - it.vel.x) * 0.3;
      const tilt = clamp(-it.vel.x * 0.9, -0.16, 0.16);
      g.rotation.z += (it.restRot + tilt - g.rotation.z) * 0.14;
      it.paper.rotation.x = Math.sin(t * 0.7 + it.baseZ * 40) * 0.006;
    }

    // prune ropes whose kill() animation finished (mesh removed from scene)
    for (let i = ropes.length - 1; i >= 0; i--) {
      const r = ropes[i]!;
      if (r.dying && !r.mesh.parent) ropes.splice(i, 1);
    }

    const sdt = dt / SUBSTEPS;
    for (const r of ropes) {
      if (!r.mesh.visible) continue;
      for (let s = 0; s < SUBSTEPS; s++) r.step(sdt, t);
      r.render();
    }

    dust.step(dt, t);
    rig.apply(t, camera, lamp.target);
    lamp.intensity =
      7 + Math.sin(t * 13.7) * 0.055 + Math.sin(t * 3.1) * 0.09;

    if (++frameN % 6 === 0) {
      drawMinimap();
      const pct = Math.round((Z_HOME / rig.z) * 100);
      if (pct !== lastPct) {
        hooks.onZoomChange(pct);
        lastPct = pct;
      }
    }
    renderer.render(scene, camera);
    scheduleFrame();
  }

  function onVisibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      scheduleFrame();
    }
  }

  /* ============================================================
     WIRE EVENTS + INTRO
     ============================================================ */
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('contextmenu', onContextMenu);
  stage.addEventListener('dblclick', onDblClick);
  stage.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibilityChange);

  // opening: pull in from wide
  rig.z = 150;
  rig.tz = Z_HOME;
  setTool('select');
  findMinimap();
  scheduleFrame();

  /* ============================================================
     API
     ============================================================ */
  function dispose() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    stage.removeEventListener('pointerdown', onPointerDown);
    stage.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    stage.removeEventListener('contextmenu', onContextMenu);
    stage.removeEventListener('dblclick', onDblClick);
    stage.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (mm) mm.removeEventListener('pointerdown', onMmDown);
    if (mmMoveH) window.removeEventListener('pointermove', mmMoveH);
    if (mmUpH) window.removeEventListener('pointerup', mmUpH);
    stage.classList.remove('dragging', 'item', 'connecting', 'lasso');
    // stop tweens before teardown so stray onCompletes don't run
    items.forEach((it) => {
      gsap.killTweensOf(it);
      gsap.killTweensOf(it.grp.scale);
      gsap.killTweensOf(it.grp.position);
      gsap.killTweensOf(it.grp.rotation);
      gsap.killTweensOf(it.paper.scale);
      gsap.killTweensOf(pinHead(it).scale);
      gsap.killTweensOf(pinHeadMat(it));
      gsap.killTweensOf(it.glow.material);
    });
    ropes.forEach((r) => {
      gsap.killTweensOf(r);
      gsap.killTweensOf(r.mat);
    });
    ropes.length = 0;
    keyedRopes.clear();
    ropeKeyOf.clear();
    pendingSince.clear();
    items.length = 0;
    itemById.clear();
    hitMeshes.length = 0;
    sigByItem.clear();
    thumbnailByItem.clear();
    imgByItem.clear();
    imgLoading.clear();
    tintByItem.clear();
    sel.clear();
    primary = null;
    liveRope = null;
    clearRopeContext(scene);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat)
        (Array.isArray(mat) ? mat : [mat]).forEach((mm2) => {
          const sm = mm2 as THREE.MeshStandardMaterial;
          sm.map?.dispose();
          sm.bumpMap?.dispose();
          mm2.dispose();
        });
    });
    fiberTex.dispose();
    renderer.dispose();
  }

  return {
    setTool,
    setThreadColor(colorHex: number) {
      threadColor = colorHex;
      if (liveRope) recolorRope(liveRope, colorHex);
    },
    upsertItem,
    removeItem,
    syncRopes,
    setSelection(ids: string[], primaryId: string | null) {
      sel.forEach((it) => setGlow(it, false));
      sel.clear();
      primary = null;
      ids.forEach((id) => {
        const it = itemById.get(id);
        if (it) {
          sel.add(it);
          setGlow(it, true);
        }
      });
      const p = primaryId ? itemById.get(primaryId) : undefined;
      primary = p ?? [...sel].pop() ?? null;
    },
    setTypeVisibility(vis: Record<string, boolean>) {
      for (const k of Object.keys(filterState)) delete filterState[k];
      Object.assign(filterState, vis);
      items.forEach(applyFilterTo);
      ropes.forEach((r) => r.syncVisible());
    },
    zoomIn() {
      rig.tz = clamp(rig.tz * 0.8, 16, 120);
      rig.wake();
    },
    zoomOut() {
      rig.tz = clamp(rig.tz * 1.25, 16, 120);
      rig.wake();
    },
    center() {
      rig.tx = 0;
      rig.ty = 1;
      rig.tz = Z_HOME;
    },
    focusItem(id: string) {
      const it = itemById.get(id);
      if (!it) return;
      rig.tx = clamp(
        it.grp.position.x,
        -BOARD_W / 2 + 8,
        BOARD_W / 2 - 8,
      );
      rig.ty = clamp(
        it.grp.position.y,
        -BOARD_H / 2 + 6,
        BOARD_H / 2 - 6,
      );
      rig.tz = 44;
      selectOnly(it);
    },
    setPaused(p: boolean) {
      if (paused === p) return;
      paused = p;
      if (paused) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else {
        scheduleFrame();
      }
    },
    getSpawnPoint() {
      return { x: rig.tx + rnd(-6, 6), y: rig.ty + rnd(-4, 4) };
    },
    getItemThumbnail(id: string) {
      const it = itemById.get(id);
      if (!it) return null;
      let thumbnail = thumbnailByItem.get(id);
      if (!thumbnail) {
        thumbnail = it.canvas.toDataURL('image/jpeg', 0.6);
        thumbnailByItem.set(id, thumbnail);
      }
      return thumbnail;
    },
    getItemStrength(id: string) {
      const it = itemById.get(id);
      if (!it || !it.ropes.length) return 0;
      return (
        it.ropes.reduce((s, r) => s + r.meta.confidence, 0) /
        it.ropes.length
      );
    },
    getItemConnections(id: string) {
      const it = itemById.get(id);
      if (!it) return [];
      return it.ropes
        .filter((r) => !r.dying)
        .map((r) => {
          const o = r.other(it);
          return o ? { otherId: o.id, confidence: r.meta.confidence } : null;
        })
        .filter((x): x is { otherId: string; confidence: number } => !!x);
    },
    dispose,
  };
}
