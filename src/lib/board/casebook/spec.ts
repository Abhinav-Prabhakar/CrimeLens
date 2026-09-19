/**
 * Maps CrimeLens store entities/relationships onto Casebook board specs.
 * The card's main text is derived from `entity.notes` (falling back to
 * `label`), so the dbl-click editor edits `notes` uniformly across types.
 */
import type { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { THREAD_COLOR_HEX, type ItemSpec, type RopeSpec, type ThreadColorId } from './types';

/** Types whose text can be edited via the dbl-click editor (have painters that consume `text`). */
const EDITABLE_TYPES = new Set(['photo', 'suspect', 'sticky', 'doc', 'news', 'map', 'statement']);

export function itemSpecForEntity(ent: InvestigationEntity): ItemSpec {
  const a = ent.attributes || {};
  const text = a.cardText || ent.notes || ent.label || '';
  const spec: ItemSpec = {
    id: ent.id,
    type: ent.visualType,
    x: ent.boardPosition?.x ?? 0,
    y: ent.boardPosition?.y ?? 0,
    rot: ent.boardPosition?.rotation,
    title: a.cardTitle || ent.label,
    text,
    created: ent.createdAt ? Date.parse(ent.createdAt) : undefined,
    by: ent.provenance?.sourceTitle || 'Investigator',
    tags: ent.tags,
    editable: EDITABLE_TYPES.has(ent.visualType),
  };

  switch (ent.visualType) {
    case 'photo':
      spec.style = a.photoStyle;
      if (a.imageDataUrl) spec.imageUrl = a.imageDataUrl;
      break;
    case 'suspect':
      spec.role = a.role || (ent.type === 'person' ? 'PERSON OF INTEREST' : ent.type.toUpperCase());
      spec.gender = a.gender;
      break;
    case 'sticky':
      spec.tint = a.tint;
      break;
    case 'news':
      spec.paper = a.paper;
      spec.chart = a.chart;
      break;
    case 'statement':
      spec.sig = a.sig || ent.provenance?.sourceTitle;
      break;
    case 'bag':
      spec.title = a.no || ent.label;
      spec.date = a.date;
      break;
    default:
      break;
  }
  return spec;
}

/** Fields that change how the card is painted — repaint when this changes. */
export function specSignature(spec: ItemSpec): string {
  return JSON.stringify({
    t: spec.type,
    ti: spec.title,
    tx: spec.text,
    s: spec.style,
    iu: spec.imageUrl,
    r: spec.role,
    g: spec.gender,
    tn: spec.tint,
    p: spec.paper,
    c: spec.chart,
    sg: spec.sig,
    d: spec.date,
  });
}

export function ropeSpecForRelationship(rel: InvestigationRelationship): RopeSpec {
  return {
    id: rel.id,
    sourceId: rel.sourceId,
    targetId: rel.targetId,
    colorHex: THREAD_COLOR_HEX[(rel.threadColor as ThreadColorId) || 'crimson'] ?? 0xb01722,
    confidence: rel.confidence ?? 0.78,
  };
}

/** Sensible defaults for the rail's "+ pin" quick-add buttons (reference defaults). */
export function defaultSpecForType(type: string, at: { x: number; y: number }): Partial<ItemSpec> {
  const defaults: Record<string, Partial<ItemSpec>> = {
    doc: { title: 'New report', text: 'Double-click to edit this document.' },
    statement: { text: 'Double-click to write\nthe statement.', sig: '' },
    sticky: { text: 'new lead?' },
    suspect: { title: 'Unknown subject', text: 'no details yet', role: 'PERSON OF INTEREST' },
    map: { text: 'New location' },
    news: { text: 'Headline goes here' },
    print: { text: 'F-?? · #?-???' },
  };
  return { ...defaults[type], ...at };
}
