/** Shared math/id helpers for the casebook board engine. */

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
