import { describe, it, expect } from 'vitest';
import { validateAssistantToolArgs, ASSISTANT_TOOLS, ASSISTANT_TOOL_ARG_SCHEMAS } from '../../src/lib/ai/assistantTools';

describe('Assistant tool argument validation', () => {
  it('declares a Groq tool definition for every zod schema', () => {
    const toolNames = ASSISTANT_TOOLS.map((t) => t.function?.name).sort();
    expect(toolNames).toEqual(Object.keys(ASSISTANT_TOOL_ARG_SCHEMAS).sort());
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool.type).toBe('function');
      expect(tool.function?.parameters?.type).toBe('object');
    }
  });

  it('accepts a minimal create_entity call and applies defaults', () => {
    const result = validateAssistantToolArgs('create_entity', JSON.stringify({ label: 'Julian Marlowe' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.label).toBe('Julian Marlowe');
      expect(result.args.type).toBe('person');
    }
  });

  it('rejects create_entity with an unknown entity type', () => {
    const result = validateAssistantToolArgs(
      'create_entity',
      JSON.stringify({ label: 'X', type: 'spaceship' })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.summary).toContain('create_entity');
  });

  it('rejects create_relationship without required endpoints', () => {
    expect(validateAssistantToolArgs('create_relationship', '{}').ok).toBe(false);
    expect(
      validateAssistantToolArgs('create_relationship', JSON.stringify({ source: 'A' })).ok
    ).toBe(false);
  });

  it('rejects create_relationship with an off-whitelist predicate', () => {
    const result = validateAssistantToolArgs(
      'create_relationship',
      JSON.stringify({ source: 'ent_a', target: 'ent_b', predicate: 'DROP DATABASE' })
    );
    expect(result.ok).toBe(false);
  });

  it('rejects empty updates objects on update tools', () => {
    expect(
      validateAssistantToolArgs('update_entity', JSON.stringify({ entity: 'ent_1', updates: {} })).ok
    ).toBe(false);
    expect(
      validateAssistantToolArgs(
        'update_relationship',
        JSON.stringify({ relationshipId: 'rel_1', updates: {} })
      ).ok
    ).toBe(false);
  });

  it('rejects out-of-range confidence scores', () => {
    const result = validateAssistantToolArgs(
      'create_entity',
      JSON.stringify({ label: 'X', confidence: 1.7 })
    );
    expect(result.ok).toBe(false);
  });

  it('requires a description for add_timeline_event', () => {
    expect(validateAssistantToolArgs('add_timeline_event', '{}').ok).toBe(false);
    const ok = validateAssistantToolArgs(
      'add_timeline_event',
      JSON.stringify({ description: 'Warehouse breach observed', category: 'forensic' })
    );
    expect(ok.ok).toBe(true);
  });

  it('fails cleanly on malformed JSON and unknown tools', () => {
    const bad = validateAssistantToolArgs('create_entity', '{not json');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.summary).toContain('Malformed JSON');

    const unknown = validateAssistantToolArgs('nuke_database', '{}');
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.summary).toContain('Unknown tool');
  });
});
