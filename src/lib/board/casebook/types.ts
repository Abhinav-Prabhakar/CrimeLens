/**
 * Shared types + constants for the Casebook corkboard engine.
 * Ported from the reference app (casebook — Blackwood Dossier, three.js r128)
 * and adapted to our typed data model.
 */
import type * as THREE from 'three';
import type { BoardCardType } from '@/lib/types/investigation';

/* ---------- Board geometry ---------- */
export const BOARD_W = 132;
export const BOARD_H = 76;
export const PAPER_Z = 0.22;
export const PIN_Z = 1.05;
export const Z_HOME = 80;

/* ---------- Threads (yarn colors) ---------- */
export type ThreadColorId = 'crimson' | 'twine' | 'cobalt' | 'shadow';

export const THREADS: { id: ThreadColorId; name: string; color: number }[] = [
  { id: 'crimson', name: 'Crimson', color: 0xb01722 },
  { id: 'twine', name: 'Twine', color: 0xc9a76a },
  { id: 'cobalt', name: 'Cobalt', color: 0x2f5f9e },
  { id: 'shadow', name: 'Shadow', color: 0x22201d },
];

export const THREAD_COLOR_HEX: Record<ThreadColorId, number> = {
  crimson: 0xb01722,
  twine: 0xc9a76a,
  cobalt: 0x2f5f9e,
  shadow: 0x22201d,
};

export const PIN_COLORS: Record<BoardCardType, number> = {
  photo: 0xb01722,
  suspect: 0x1a1a1a,
  sticky: 0xd9a520,
  doc: 0x2f5f9e,
  news: 0xb01722,
  print: 0x1a1a1a,
  map: 0x2e7d4f,
  statement: 0x2f5f9e,
  bag: 0x8a5a20,
  key: 0xa8823c,
  plan: 0x2f5f9e,
};

export const TYPE_LABEL: Record<BoardCardType, string> = {
  photo: 'Image',
  suspect: 'Suspect card',
  sticky: 'Sticky note',
  doc: 'Document',
  news: 'Clipping',
  print: 'Fingerprint',
  map: 'Location card',
  statement: 'Note',
  bag: 'Evidence bag',
  key: 'Physical evidence',
  plan: 'Floor plan',
};

export const TYPE_TAGS: Record<BoardCardType, string[]> = {
  photo: ['crime scene', 'image'],
  suspect: ['person'],
  sticky: ['note'],
  doc: ['document'],
  news: ['press'],
  print: ['forensics'],
  map: ['location'],
  statement: ['witness'],
  bag: ['forensics', 'evidence'],
  key: ['evidence'],
  plan: ['interior'],
};

/** Board tool modes — 'pan' means drag anywhere pans (even over cards). */
export type BoardTool = 'select' | 'lasso' | 'connect' | 'pan';

/* ---------- Item creation spec ----------
 * Everything a painter/world needs to (re)draw a board card.
 * Produced from an InvestigationEntity by spec.ts — all fields optional
 * except id/type/x/y which the store always provides. */
export interface ItemSpec {
  id: string;
  type: BoardCardType;
  x: number;
  y: number;
  rot?: number;
  title?: string;
  text?: string;
  /** photo: HTMLImageElement/canvas OR (via imageUrl) a data-URL to load */
  img?: CanvasImageSource | null;
  imageUrl?: string;
  style?: string; // photo scene style: 'car' | 'alley' | 'loft' | 'fiber' | undefined
  role?: string; // suspect role banner
  gender?: string; // suspect silhouette variant
  tint?: string; // sticky tint 'y' | 'p' | 'g' | 'b'
  paper?: string; // news paper name
  chart?: boolean; // news mini chart
  sig?: string; // statement signature
  date?: string; // evidence bag date
  curl?: number; // paper curl override
  created?: number; // epoch ms
  by?: string; // investigator name
  tags?: string[];
  editable?: boolean; // dbl-click opens text editor
}

/* ---------- Runtime item (owned by world.ts) ---------- */
export interface ItemNote {
  text: string;
  by: string;
}

export interface BoardItem {
  id: string;
  type: BoardCardType;
  grp: THREE.Group;
  paper: THREE.Mesh;
  glow: THREE.Mesh;
  pin: THREE.Group; // pin.userData.head = sphere mesh
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  spec: ItemSpec;
  text: string;
  title: string;
  ropes: RopeLike[];
  baseZ: number;
  hoverLift: number;
  dragLift: number;
  target: THREE.Vector3;
  vel: THREE.Vector2;
  restRot: number;
  meta: {
    created: number;
    by: string;
    tags: string[];
    notes: ItemNote[];
  };
}

/** Structural interface so world.ts can reference Rope without a cycle. */
export interface RopeLike {
  a: RopeAnchor;
  b: RopeAnchor;
  color: number;
  live: boolean;
  dying: boolean;
  mesh: THREE.Mesh;
  meta: { label: string | null; confidence: number; created: number };
  other(it: BoardItem): BoardItem | null;
  hold(on: boolean): void;
  highlight(on: boolean): void;
  syncVisible(): void;
  detach(): void;
  kill(): void;
}

export interface RopeAnchor {
  item: BoardItem | null;
  get(v: THREE.Vector3): THREE.Vector3;
}

/* ---------- Relationship → rope projection ---------- */
export interface RopeSpec {
  id: string;
  sourceId: string;
  targetId: string;
  colorHex: number;
  confidence: number;
}

/* ---------- World ↔ React bridge ---------- */
export interface WorldHooks {
  /** selection changed inside the world (click, lasso, clear) */
  onSelect(ids: string[], primaryId: string | null): void;
  /** drag finished — commit final board positions */
  onCommitPositions(moves: { id: string; x: number; y: number }[]): void;
  /** a live rope was tied between two pins → create a relationship */
  onRequestConnect(sourceId: string, targetId: string): void;
  /** dbl-click on an editable card */
  onEditItem(id: string): void;
  /** Delete/Backspace pressed with an active selection */
  onRequestDelete(ids: string[]): void;
  /** hint bar copy updates (html string) */
  onHint(html: string): void;
  /** zoom percent changed */
  onZoomChange(pct: number): void;
  /** world wants the tool switched (e.g. lasso → select after finishing) */
  onToolRequest?(t: BoardTool): void;
}

export interface WorldApi {
  setTool(t: BoardTool): void;
  setThreadColor(colorHex: number): void;
  upsertItem(spec: ItemSpec): void;
  removeItem(id: string): void;
  syncRopes(rels: RopeSpec[]): void;
  setSelection(ids: string[], primaryId: string | null): void;
  setTypeVisibility(vis: Record<string, boolean>): void;
  zoomIn(): void;
  zoomOut(): void;
  center(): void;
  focusItem(id: string): void;
  setPaused(paused: boolean): void;
  /** a random spawn point near the current camera target (for quick-add) */
  getSpawnPoint(): { x: number; y: number };
  /** dataURL thumbnail of a card's canvas for the inspector */
  getItemThumbnail(id: string): string | null;
  /** average rope confidence touching an item (0–1) for the strength meter */
  getItemStrength(id: string): number;
  /** ordered connection specs for an item (for the inspector list) */
  getItemConnections(id: string): { otherId: string; confidence: number }[];
  dispose(): void;
}
