import { describe, it, expect } from 'vitest';
import {
  entityToNodeProps,
  nodePropsToEntity,
  relationshipToEdgeProps,
  edgePropsToRelationship,
  caseToNodeProps,
  nodePropsToCase,
  predicateToRelType,
  relTypeToPredicate,
} from '../../src/lib/graph/syncTransform';
import { SEED_CASE, SEED_ENTITIES, SEED_RELATIONSHIPS } from '../../src/lib/storage/seedData';

describe('Neo4j Graph Transforms', () => {
  it('round-trips seed entities through node properties without loss', () => {
    for (const ent of SEED_ENTITIES) {
      const restored = nodePropsToEntity(entityToNodeProps(ent) as any);
      expect(restored.id).toBe(ent.id);
      expect(restored.label).toBe(ent.label);
      expect(restored.type).toBe(ent.type);
      expect(restored.aliases).toEqual(ent.aliases);
      expect(restored.tags).toEqual(ent.tags);
      expect(restored.attributes).toEqual(ent.attributes);
      expect(restored.provenance).toEqual(ent.provenance);
      expect(restored.boardPosition.x).toBe(ent.boardPosition.x);
      expect(restored.boardPosition.y).toBe(ent.boardPosition.y);
      expect(restored.boardPosition.rotation).toBe(ent.boardPosition.rotation ?? 0);
      expect(restored.confidence).toBe(ent.confidence);
      expect(restored.status).toBe(ent.status);
      expect(restored.visualType).toBe(ent.visualType);
    }
  });

  it('round-trips seed relationships through edge properties preserving predicates', () => {
    for (const rel of SEED_RELATIONSHIPS) {
      const props = relationshipToEdgeProps(rel) as any;
      expect(props.predicate).toBe(rel.predicate);
      const restored = edgePropsToRelationship(props, props.predicate, rel.sourceId, rel.targetId);
      expect(restored.predicate).toBe(rel.predicate);
      expect(restored.sourceId).toBe(rel.sourceId);
      expect(restored.targetId).toBe(rel.targetId);
      expect(restored.confidence).toBe(rel.confidence);
      expect(restored.weight).toBe(rel.weight);
      expect(restored.threadColor).toBe(rel.threadColor);
      expect(restored.manuallyConfirmed).toBe(rel.manuallyConfirmed);
      expect(restored.validFrom ?? null).toBe(rel.validFrom ?? null);
      expect(restored.provenance).toEqual(rel.provenance);
    }
  });

  it('round-trips the case record', () => {
    const restored = nodePropsToCase(caseToNodeProps(SEED_CASE) as any);
    expect(restored.id).toBe(SEED_CASE.id);
    expect(restored.title).toBe(SEED_CASE.title);
    expect(restored.priority).toBe(SEED_CASE.priority);
    expect(restored.incidentDate ?? null).toBe(SEED_CASE.incidentDate ?? null);
    expect(restored.tags).toEqual(SEED_CASE.tags);
  });

  it('sanitizes predicates into whitelist relationship types (injection-safe)', () => {
    expect(predicateToRelType('CALLED')).toBe('CALLED');
    expect(predicateToRelType('transferred_funds')).toBe('TRANSFERRED_FUNDS');
    expect(predicateToRelType('DROP DATABASE nuffin')).toBe('ASSOCIATED_WITH');
    expect(predicateToRelType('')).toBe('ASSOCIATED_WITH');
    expect(predicateToRelType(null)).toBe('ASSOCIATED_WITH');
  });

  it('recovers predicates from edge properties, falling back to the stored type', () => {
    expect(relTypeToPredicate('CALLED', 'CALLED')).toBe('CALLED');
    expect(relTypeToPredicate('CALLED', undefined)).toBe('CALLED');
    expect(relTypeToPredicate('WEIRD_TYPE', 'TRANSFERRED_FUNDS')).toBe('TRANSFERRED_FUNDS');
    expect(relTypeToPredicate('WEIRD_TYPE', 'also weird')).toBe('ASSOCIATED_WITH');
  });

  it('degrades gracefully on malformed stored JSON', () => {
    const restored = nodePropsToEntity({
      id: 'e1',
      caseId: 'c1',
      type: 'person',
      label: 'Broken Record',
      attributesJson: '{not valid json',
      provenanceJson: 'null',
      aliases: 'not-an-array',
      boardX: 5,
      boardY: -3,
    });
    expect(restored.attributes).toEqual({});
    expect(restored.aliases).toEqual([]);
    expect(restored.provenance.sourceTitle).toBe('Unknown source');
    expect(restored.boardPosition).toEqual({ x: 5, y: -3, rotation: 0 });
  });
});
