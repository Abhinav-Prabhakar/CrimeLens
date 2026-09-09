# CrimeLens — Prototype → Production Polish Plan

> **Audit date:** 2026-09-09 · **Status:** All 18 existing tests pass, production build green.
> This document is the gap analysis between what README/technical.md/design.md *claim* and what the
> code *does*, followed by the implemented fixes. Every item below was implemented in this pass.

---

## Part 1 — Audit Findings

### A. Simulated / hardcoded features contradicting the "Zero Fallbacks" philosophy

| # | Finding | Severity |
|---|---------|----------|
| A1 | **Forensic Image Analysis is theater.** `ImageAnalysisModal` shows 3 hardcoded "specimens" and runs a `setTimeout(600ms)` pretending to analyze pixels. Directly contradicts the project's core "Zero Fallbacks: all analysis executes against real models or returns explicit errors" guarantee. | Critical |
| A2 | **Timeline is 100% hardcoded.** `InvestigationTimelineView` renders 7 fixed demo events referencing seed entity IDs (`ent_marlowe`, …). Any newly created case still shows the Blackwood heist chronology. The ingestion pipeline even extracts `timelineEvents` from the LLM — and drops them on the floor. | Critical |
| A3 | **Public Intel is volatile.** `intel_submissions` IndexedDB store + `saveIntelSubmission`/`getAllIntelSubmissions` exist but are never called. Tips are in-memory React state, reset on every open, with a fixed fake `0.75` credibility score. | High |
| A4 | **Women Safety contacts are volatile.** Added contacts vanish on reload; SOS "dispatch" is a 5-second colored button with no record anywhere. | High |
| A5 | **Case Prioritization ranking does not exist.** README claims "configurable prioritization ranking based on public risk severity, urgency, solvability, and network entity density" — implementation is a manual dropdown. | Medium |

### B. Core logic bugs

| # | Finding | Severity |
|---|---------|----------|
| B1 | **Case switching does `window.location.reload()`** and the store then boots into `cases[0]` (insertion order) — *not* the case the user picked. Creating + selecting a new case can silently land on the old seed case. Active-case persistence (design.md §7: "LocalStorage: Active case ID") is absent. | Critical |
| B2 | **Entity merge corrupts provenance & duplicates relationships.** `handleMergeEntities` re-creates every redirected relationship through `addRelationship`, which assigns new IDs, resets provenance to "Manual Pin Connection", and forces `manuallyConfirmed: true` even for `verified_source` bank records. Merged entity attributes are discarded. The `entities_merged` audit action is never logged. | Critical |
| B3 | **Audit trail covers ~1 of 14 declared actions.** The `AuditLogEntry.action` union declares case/entity/relationship/document/report operations; only `entity_created` is ever logged. "Immutable audit log recording every investigator action" is currently false. | Critical |
| B4 | **`commitExtraction` matches entities by exact lowercase label only.** "Daniel Vance" vs "Danny V" (a declared alias) duplicates nodes; `documents` store never written; no audit; random placement overlaps cards (design.md §5 requires "sensible collision-free placement"). | High |
| B5 | **No import.** README claims "cross-team sharing via `.crimelens.json` export **and import**" — only export exists, and the export omits `intel_submissions`. | High |
| B6 | **Graph view hit-testing is wrong off-aspect.** Canvas bitmap is fixed 1200×750 but CSS-stretched; clicks map screen pixels to bitmap pixels without scaling, so node selection misses whenever the container aspect differs. No DPR handling. | High |
| B7 | **Force simulation never runs.** `nodePositions` carry unused `vx/vy`; nodes are static board-coordinate projections with no layout, no drag, no zoom/pan — despite "2D Force Knowledge Graph" in the architecture diagram. | High |
| B8 | **InspectorDrawer shows stale state.** `useState(entity.notes)` initializes once; selecting another entity while the drawer is open keeps the previous entity's notes/label in the inputs. | High |
| B9 | **Anomaly detectors ignore time.** `incidentDate` parameter is accepted but unused; every `LOCATED_AT` edge is flagged "during breach window" regardless of when; communication bursts flag at any time; mirrored A→B→C / B→A→C duplicates are double-reported. | Medium |
| B10 | **Lasso tool is a no-op.** Tool rail offers "lasso"; `selectedEntityIds` state exists; no lasso is implemented anywhere. README advertises "lasso multi-selection". | Medium |
| B11 | **Louvain is non-deterministic** (`sort(() => Math.random() - 0.5)` shuffle) — the same case yields different communities per run. Unacceptable for an evidential tool. | Medium |
| B12 | **Undo/Redo (design.md §2 "History Stack Undo/Redo") is entirely missing.** | Medium |
| B13 | **Assistant has no memory.** Each question is sent without conversation history, so follow-ups ("elaborate on hypothesis 2") are impossible. | Medium |
| B14 | **GlobalSearch footer promises "Press ESC to close" but no ESC handler exists.** Search only covers entities, not relationships/documents. | Low |
| B15 | **Reset-to-seed wipes without confirmation.** | Low |
| B16 | **Filters only apply to the corkboard**, not the graph projection, though both are "projections of the same pipeline" (design.md §5). | Low |

### C. Performance flaws

| # | Finding | Severity |
|---|---------|----------|
| C1 | **The entire Three.js scene rebuilds on every entity/relationship change.** The effect depends on `entities` — every drag-release, confidence tweak, or ingestion regenerates all card textures (canvas paints per card), the 45,000-speckle cork texture, and resets the camera. | Critical |
| C2 | **Threads don't re-drape while dragging** — they only update after the scene rebuild following pointer-up. | Medium |

### D. Documentation drift

- README badge says "Groq LLaMA 3.3 70B" while the gateway actually runs `openai/gpt-oss-120b/20b`.
- technical.md describes Louvain; implementation is weighted label propagation (documented as such in §4.4 already, but README calls it "Louvain Community Clusters").
- design.md §6.1 lists llama models; §2 mentions "Fallback heuristic extraction" which was already removed (zero-fallback).

---

## Part 2 — Implemented Fixes

### 1. Real forensic vision analysis (fixes A1)
- New API route **`/api/vision`**: accepts a base64 image (≤ 4 MB), sends it to Groq's vision-capable
  model (`meta-llama/llama-4-scout-17b-16e-instruct`) with a strict-JSON forensic prompt
  (classification, description, plate/make extraction when relevant, confidence + explicit
  uncertainty statement). Zero-fallback: missing key / model error / unparsable output → HTTP 500
  with actionable message.
- `ImageAnalysisModal` rewritten: real file upload with preview, run analysis, **human-in-the-loop
  staging** (investigator edits label/notes before pinning), commits as `ai_inferred` forensic
  evidence with image provenance — mirroring the ingestion staging pattern from design.md §3.

### 2. Data-driven investigation timeline (fixes A2)
- New lib **`src/lib/temporal/timeline.ts`**: derives events from *real case data* —
  relationship `validFrom`/`provenance.timestamp` (categorized by predicate), the case incident
  anchor, ingested documents, and AI-extracted `timelineEvents` now **persisted** into a new
  `timeline_events` IndexedDB store at commit time.
- New **temporal scrubber**: slider across the full case chronology showing the network state
  (active nodes / edges, dominant hub by degree, density) *as of* any point in time.
- Before/After comparison cards are now **computed** from the filtered graph (node/edge counts,
  top hub, dominant activity categories) instead of hardcoded prose.
- New store action `addTimelineEvent` for manual event pinning.

### 3. Store rewrite — the investigation backbone (fixes B1–B4, B10, B12, C1 dependencies)
- `switchCase(id)` / `createCase(data)` / `deleteCase(id)`: no page reloads; active case persisted
  to localStorage per design.md §7.
- `mergeEntities(keptId, mergedId)`: relationships are **moved** preserving IDs, predicates,
  provenance, and confidence; attributes merged (kept wins conflicts); aliases unioned;
  `entities_merged` audit logged.
- **Audit logging on every mutating action**: entity/relationship create/update/delete/confirm,
  merges, document ingestion, AI extraction approval, reports, case lifecycle, import/export,
  SOS dispatch, intel triage/promotion, predicted-link confirmation.
- **Undo/redo history stack** (⌘Z / ⌘⇧Z) with DB reconciliation.
- `commitExtraction` hardened: fuzzy + alias matching via `identityMatcher` (no duplicate nodes),
  collision-free spiral placement, `IngestedDocument` record written, AI timeline events persisted,
  audited as `document_ingested` + `ai_extraction_approved`.
- Relationship deletion/confirmation actions (used by InspectorDrawer and predicted links).

### 4. Corkboard incremental rendering + lasso (fixes B10, C1, C2)
- Scene/camera/renderer/lighting built **once**; a diff-sync layer adds/updates/removes card
  groups and only regenerates a card's texture when its content actually changed. Camera
  position survives edits; drags no longer rebuild the world.
- Threads **re-drape live** while dragging (Verlet-style catenary recomputation per frame for
  edges touching the dragged card).
- **Lasso tool**: rubber-band polygon drawn on the board, point-in-polygon selection of cards,
  multi-select highlight, group drag, group delete, clear-selection mini bar.

### 5. Knowledge graph overhaul (fixes B6, B7, B16)
- DPR-aware canvas sized to its container; click coordinates correctly scaled.
- Real **force-directed simulation** (repulsion + spring + centering, alpha-decayed, reheats on
  data change/drag) with node dragging and wheel zoom / empty-space pan.
- Board `filterTypes` now apply to the graph projection as well.
- Predicted links confirmed from the drawer become `predicted`-status edges confirmable from the
  Inspector (closing the human-in-the-loop loop).

### 6. Inspector fixes (fixes B8)
- Drawer remounts per entity (`key`), so state can never go stale.
- Relationship management: confirm AI-inferred/predicted links, delete threads.
- Full attribute editor (add/edit/remove key-value pairs) and alias editor.

### 7. Public intel triage (fixes A3)
- Submissions persisted in the `intel_submissions` store; queue loads from IndexedDB.
- New **credibility heuristic lib** (`src/lib/intel/credibility.ts`): scores tips on specificity
  signals (length, plate/phone/time/coordinate patterns, named location) and **corroboration
  against existing case entities** — with a transparent factor breakdown shown to the investigator.
- Triage actions (verify / dismiss) persist status; "Send to AI Extraction" pre-fills the
  ingestion modal with the tip text; promotion is audited.

### 8. Women safety persistence (fixes A4)
- Trusted contacts stored in a new `safety_contacts` IndexedDB store (add/remove, survives reload).
- SOS dispatch attempts geolocation (explicitly noted when unavailable), produces a per-contact
  dispatch status list + 1091 escalation, and writes an `sos_dispatched` audit entry to the
  active case chain of custody.

### 9. Case prioritization engine (fixes A5)
- New lib `src/lib/cases/prioritization.ts`: weighted, **configurable** score =
  40% base priority weight + 20% network entity density + 25% open-anomaly load + 15% urgency
  (incident recency). Case switcher sorts by score and shows the factor breakdown chips.

### 10. Anomaly temporal correctness (fixes B9)
- `detectSuspiciousPatterns` now receives and honors `incidentDate`: communication bursts must
  overlap the ±72 h pre-incident window (edges without temporal data are flagged `medium` with an
  explicit "temporal data unavailable" caveat); geographic anomalies must overlap the incident
  window; mirrored hop duplicates deduped.

### 11. Remaining fixes
- Deterministic (seeded-shuffle) label propagation → stable communities across runs (B11).
- Assistant sends rolling conversation history; `/api/assistant` accepts and sanitizes it (B13).
- ESC closes the topmost modal; GlobalSearch searches entities **and** relationships/documents (B14).
- Reset-to-seed requires an inline confirmation step (B15).
- **Import**: toolbar button loads a `.crimelens.json` bundle, validates the structure, re-IDs on
  collision, restores all stores, and switches to the imported case (B5). Export filename now uses
  the documented `.crimelens.json` extension and includes intel submissions.
- Audit log modal: full timestamps + action-type filter (D).
- README / technical.md updated to describe the real models, the real timeline/vision/prioritization
  engines, and import/export behavior (D).

### 12. Test coverage added
- `tests/unit/casePrioritization.test.ts` — scoring ordering & factor bounds.
- `tests/unit/timelineDerivation.test.ts` — event derivation, scrubber network state, before/after stats.
- `tests/unit/tipCredibility.test.ts` — heuristic bounds & corroboration.
- `tests/unit/importBundle.test.ts` — bundle validation & collision re-ID.
- All 18 pre-existing tests kept green.
