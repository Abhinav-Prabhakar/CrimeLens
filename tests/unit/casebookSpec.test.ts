import { describe, it, expect } from 'vitest';
import { itemSpecForEntity, ropeSpecForRelationship, specSignature, defaultSpecForType } from '@/lib/board/casebook/spec';
import type { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';

const baseEntity: InvestigationEntity = {
  id: 'e1',
  caseId: 'c1',
  type: 'person',
  label: 'Marcus Lowell',
  aliases: [],
  attributes: {},
  confidence: 0.8,
  status: 'unverified',
  provenance: { sourceId: 's1', sourceType: 'fir', sourceTitle: 'FIR 12/2023', confidence: 0.9 },
  boardPosition: { x: 26, y: 14, rotation: -0.03 },
  visualType: 'suspect',
  notes: 'CFO, Lowell Tech · rival',
  tags: ['person'],
  createdAt: '2023-10-13T09:00:00Z',
  updatedAt: '2023-10-13T09:00:00Z',
};

describe('itemSpecForEntity', () => {
  it('maps position, rotation, label and notes', () => {
    const spec = itemSpecForEntity(baseEntity);
    expect(spec.id).toBe('e1');
    expect(spec.type).toBe('suspect');
    expect(spec.x).toBe(26);
    expect(spec.y).toBe(14);
    expect(spec.rot).toBe(-0.03);
    expect(spec.title).toBe('Marcus Lowell');
    expect(spec.text).toBe('CFO, Lowell Tech · rival');
    expect(spec.created).toBe(Date.parse('2023-10-13T09:00:00Z'));
  });

  it('falls back to label when notes are empty', () => {
    const spec = itemSpecForEntity({ ...baseEntity, notes: undefined });
    expect(spec.text).toBe('Marcus Lowell');
  });

  it('marks only painter-editable types as editable', () => {
    expect(itemSpecForEntity(baseEntity).editable).toBe(true);
    expect(itemSpecForEntity({ ...baseEntity, visualType: 'bag' }).editable).toBe(false);
    expect(itemSpecForEntity({ ...baseEntity, visualType: 'key' }).editable).toBe(false);
  });

  it('derives suspect role/gender and photo props from attributes', () => {
    const sus = itemSpecForEntity({ ...baseEntity, attributes: { role: 'WITNESS', gender: 'f' } });
    expect(sus.role).toBe('WITNESS');
    expect(sus.gender).toBe('f');
    const ph = itemSpecForEntity({
      ...baseEntity,
      visualType: 'photo',
      attributes: { photoStyle: 'alley', imageDataUrl: 'data:image/png;base64,x' },
    });
    expect(ph.style).toBe('alley');
    expect(ph.imageUrl).toBe('data:image/png;base64,x');
  });

  it('maps bag number/date overrides', () => {
    const bag = itemSpecForEntity({
      ...baseEntity,
      visualType: 'bag',
      attributes: { no: '14-8397', date: '10/12/23' },
    });
    expect(bag.title).toBe('14-8397');
    expect(bag.date).toBe('10/12/23');
  });
});

describe('specSignature', () => {
  it('ignores position/rotation but reacts to text changes', () => {
    const a = itemSpecForEntity(baseEntity);
    const moved = { ...a, x: 99, y: -99, rot: 0.5 };
    expect(specSignature(moved)).toBe(specSignature(a));
    const edited = { ...a, text: 'new details' };
    expect(specSignature(edited)).not.toBe(specSignature(a));
  });
});

describe('ropeSpecForRelationship', () => {
  const rel: InvestigationRelationship = {
    id: 'r1',
    caseId: 'c1',
    sourceId: 'e1',
    targetId: 'e2',
    predicate: 'ASSOCIATED_WITH',
    weight: 1,
    confidence: 0.6,
    status: 'unverified',
    threadColor: 'twine',
    provenance: { sourceId: 's1', sourceType: 'fir', sourceTitle: 'FIR', confidence: 0.9 },
    manuallyConfirmed: false,
    createdAt: '',
    updatedAt: '',
  };
  it('maps endpoints, color and confidence', () => {
    const rope = ropeSpecForRelationship(rel);
    expect(rope.id).toBe('r1');
    expect(rope.sourceId).toBe('e1');
    expect(rope.targetId).toBe('e2');
    expect(rope.colorHex).toBe(0xc9a76a);
    expect(rope.confidence).toBe(0.6);
  });
  it('defaults unknown colors to crimson', () => {
    const rope = ropeSpecForRelationship({ ...rel, threadColor: 'bogus' as any });
    expect(rope.colorHex).toBe(0xb01722);
  });
});

describe('defaultSpecForType', () => {
  it('provides reference quick-add defaults and applies spawn position', () => {
    const spec = defaultSpecForType('sticky', { x: 3, y: -4 });
    expect(spec.text).toBe('new lead?');
    expect(spec.x).toBe(3);
    expect(spec.y).toBe(-4);
  });
});
