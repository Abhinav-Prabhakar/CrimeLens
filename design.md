# CrimeLens Design System

## 1. Purpose

This document is the visual and interaction source of truth for CrimeLens.

The 3D Casebook evidence board is the canonical design reference. Every screen, modal, drawer, analytical view, empty state, and control must feel like part of the same physical investigative workspace. New UI must not introduce a separate dashboard aesthetic, generic SaaS styling, bright glassmorphism, or unrelated component language.

The system should feel:

- tactile rather than decorative;
- investigative rather than accusatory;
- dense but legible;
- cinematic without reducing usability;
- physical where evidence is handled;
- precise and restrained where analysis is displayed;
- consistent across corkboard, graph, timeline, reports, AI, and safety workflows.

Feature preservation is mandatory. Restyling must not remove actions, fields, filters, provenance, confidence, validation, auditability, keyboard shortcuts, or human confirmation steps.

---

## 2. Design Principles

### 2.1 The board is the world

The corkboard is not a decorative landing page. It establishes the material, lighting, color, hierarchy, and motion language for the entire product.

- Evidence is represented as paper, photographs, tags, pins, and thread.
- Analysis is represented as a dark investigator's desk layered over the evidence world.
- Modals are dossier trays placed above the desk, not generic floating rectangles.
- Drawers are case folders pulled in from an edge.
- Alerts are evidence stamps, status lamps, or restrained red markings.

### 2.2 Information before ornament

Every visual treatment must reinforce one of:

- evidence type;
- verification status;
- provenance;
- confidence;
- selection;
- relationship strength;
- urgency;
- workflow state.

Noise, texture, shadows, and animation must never obstruct content or imply certainty that the data does not have.

### 2.3 Physical and analytical layers

CrimeLens uses two related material layers:

1. **Evidence layer**: cork, paper, photographs, ink, pins, thread, handwriting.
2. **Analysis layer**: charcoal panels, warm black metal, inset controls, monospaced labels, red evidence marks.

The evidence layer may be irregular and tactile. The analysis layer must be aligned, compact, and operational.

### 2.4 Responsible visual semantics

- Red means active investigation, destructive action, urgent anomaly, or selected evidence. It never means proven guilt.
- Amber means attention, AI suggestion, provisional lead, or unresolved review.
- Cobalt means analytical structure, financial/technical linkage, or alternate relationship grouping.
- Green means successful system state or investigator verification, not innocence.
- Confidence must always be shown numerically or with an explicit strength label when it affects a decision.

---

## 3. Core Tokens

### 3.1 Color palette

| Token | Value | Usage |
|---|---:|---|
| `--cb-bg` | `#0c0a09` | application background |
| `--cb-bar` | `#100e0c` | top/bottom bars and rail |
| `--cb-panel` | `#141110` | primary dossier surfaces |
| `--cb-panel-2` | `#1a1614` | raised/inset surfaces |
| `--cb-panel-3` | `#211b18` | hover and selected neutral surfaces |
| `--cb-line` | `#2a2522` | default border and divider |
| `--cb-line-strong` | `#3a322d` | active panel outline |
| `--cb-text` | `#d9d4cc` | primary text |
| `--cb-dim` | `#8d867c` | secondary text |
| `--cb-faint` | `#5d574f` | metadata and disabled text |
| `--cb-red` | `#e13c32` | selection, urgent action, primary accent |
| `--cb-red-dim` | `#8c2620` | pressed/low-emphasis red |
| `--cb-amber` | `#d9a520` | AI/provisional/attention state |
| `--cb-twine` | `#c9a76a` | neutral relationship and warm highlight |
| `--cb-cobalt` | `#2f5f9e` | analysis and technical relationship |
| `--cb-green` | `#4a8a5a` | connected, saved, verified state |
| `--cb-cork` | `#a96e2d` | surrounding evidence-board material |
| `--cb-paper` | `#d8d0be` | light evidence paper reference |

Do not introduce saturated cyan, violet gradients, neon glows, or pure white panels.

### 3.2 Typography

**Interface sans**

```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

Used for readable UI copy, controls, messages, and long descriptions.

**Operational mono**

```css
"Courier New", Courier, monospace
```

Used for evidence metadata, timestamps, status labels, case identifiers, graph controls, audit records, and keyboard hints.

**Evidence typography**

Procedural cards may use serif, mono, handwritten, or stamped lettering according to card type. Evidence typography must remain inside the evidence artifact and must not leak into general interface controls.

### 3.3 Type scale

| Role | Size | Weight | Tracking |
|---|---:|---:|---:|
| micro metadata | 9–10px | 500–700 | `0.06em` |
| operational label | 10–11px | 700 | `0.08em` uppercase |
| body | 11–13px | 400–500 | normal |
| panel heading | 12–14px | 700 | `0.08em` uppercase |
| view title | 15–18px | 700 | `0.06em` uppercase |
| metric | 20–28px | 700 | normal |

Never use oversized marketing headings inside the application shell.

### 3.4 Spacing

Base grid: 4px.

Preferred spacing values: 4, 6, 8, 10, 12, 16, 20, 24, 32px.

- Dense tool controls: 4–8px gap.
- Panel internal spacing: 12–16px.
- Major sections: 20–24px.
- Full workspace gutters: 20–28px depending on viewport.

### 3.5 Radius

- Small controls/tags: 4–6px.
- Inputs/buttons: 6–8px.
- Panels/dossiers: 8–12px.
- Circular status indicators and pins: 999px.

Avoid excessive pill-shaped controls. Pills are reserved for compact filters, counts, and statuses.

### 3.6 Borders and shadows

Default panel border:

```css
1px solid var(--cb-line)
```

Active/raised panel border:

```css
1px solid var(--cb-line-strong)
```

Dossier shadow:

```css
0 28px 80px rgba(0, 0, 0, 0.62),
0 2px 0 rgba(255, 255, 255, 0.02) inset
```

Selected evidence uses a red additive glow in the 3D world. Analytical panels use border and shadow emphasis, never a broad neon glow.

---

## 4. Materials and Texture

### 4.1 Corkboard

- Warm ochre/brown procedural cork.
- Visible grain, pores, stains, and pinholes.
- Wood frame and brass corner hardware.
- Surrounding area must use a dark, warm, textured wall or wood surface. It must never fall to featureless black during pan or zoom.

### 4.2 Dossier surfaces

Dark UI surfaces use layered gradients and subtle texture:

```css
background:
  linear-gradient(145deg, rgba(30, 24, 21, 0.98), rgba(13, 11, 10, 0.98));
```

A low-opacity grain or ruled-paper pattern may be applied with a pseudo-element. Texture opacity must stay below 5% over text.

### 4.3 Paper surfaces

Light paper is reserved for evidence artifacts, printable report previews, or explicit document sheets. Do not place ordinary settings forms on bright paper.

### 4.4 Stamps and markers

Use red stamps for states such as confidential, critical, confirmed, staged, or rejected only when the label is explicit. Stamps should be rectangular, uppercase, and slightly worn, not glossy badges.

---

## 5. Layout System

### 5.1 Global shell

- Top bar: 52px, fixed.
- Left tool rail: 64px, fixed between top and bottom bars.
- Bottom bar: 72px, fixed.
- Main content fills the viewport behind the shell.
- Inspector: fixed right panel, approximately 296px wide.
- View content must reserve visual breathing room around fixed chrome even when it technically renders behind it.

### 5.2 Analytical workspaces

Graph, Timeline, and Anomalies use the same workspace frame:

1. compact title/metric header;
2. tool/filter strip;
3. primary analysis region;
4. optional right-side contextual tray;
5. bottom shell remains visible.

Workspace backgrounds use warm charcoal texture, not pure black.

### 5.3 Modal layout

All centered workflows use:

```text
Backdrop
└── Dossier
    ├── Red evidence rule
    ├── Header: icon, eyebrow, title, summary, close
    ├── Optional tool/filter strip
    ├── Scrollable body
    └── Sticky action footer
```

Modal widths:

- compact search/case picker: 640–720px;
- standard workflow: 760–900px;
- complex staging/report workflow: 960–1120px.

Max height: 85–90vh.

### 5.4 Drawers

Drawers enter from the right and should resemble a case folder pulled over the board:

- 420–760px width;
- full available vertical space between bars where practical;
- stronger left edge shadow;
- no disconnected floating-card appearance.

---

## 6. Component Specifications

### 6.1 Buttons

**Primary**

- red background;
- off-white text;
- 1px lighter red border;
- compact, bold label;
- 120–160ms hover transition;
- pressed state darkens and moves by at most 1px.

**Secondary**

- dark raised surface;
- neutral border;
- off-white or dim text;
- border brightens on hover.

**Danger**

- transparent/dark red tint by default;
- full red only at final confirmation.

**Icon button**

- 28–34px square;
- centered icon;
- 6–8px radius;
- tooltip/title required.

### 6.2 Inputs, textareas, and selects

- dark inset surface;
- `1px solid var(--cb-line)`;
- 6–8px radius;
- 11–13px text;
- red focus border with subtle inner shadow;
- placeholders use `--cb-faint`;
- labels are uppercase operational mono.

### 6.3 Tags and statuses

- Tags are neutral evidence labels, not large pills.
- Status color is paired with text, never color alone.
- Verification status and confidence are separate values.
- AI-derived or predicted states use amber until investigator confirmation.

### 6.4 Cards and metric tiles

Analytical cards use:

- dark dossier surface;
- neutral border;
- 8–10px radius;
- 12–16px padding;
- eyebrow label;
- one clear primary value;
- supporting evidence/provenance below.

Hover should lift by border/shadow only. Do not scale analytical cards.

### 6.5 Tables and lists

- compact row heights;
- ruled separators;
- sticky headings when long;
- selected row uses red edge/rule, not a full saturated background;
- IDs and timestamps use mono;
- empty states explain how to populate the data.

### 6.6 Toasts

- bottom-center above bottom bar;
- dark translucent dossier surface;
- subtle border;
- short operational sentence;
- 2.2 second default duration;
- no stacked notification flood.

### 6.7 Inspector

The evidence inspector remains the model for detail panels:

- artifact thumbnail;
- designation and type;
- connections with strength;
- tags;
- confidence/verification;
- notes;
- provenance;
- editable attributes;
- destructive actions at the bottom.

Any future detail drawer should follow this hierarchy.

---

## 7. Corkboard Rendering Contract

### 7.1 Layering

- Cards receive stable, deterministic depth ordering.
- Overlapping cards must never share effectively identical depth.
- Paper curl must not cause two overlapping sheets to intersect visibly.
- Active drag lifts the whole selected group above resting cards.
- Pins remain above their owning paper.
- Thread endpoints remain anchored to pin heads.
- Selection glow sits behind the card and must not z-fight with paper.

### 7.2 Surrounding environment

- The full camera view must always have a designed material behind it.
- Panning beyond the cork frame reveals a dark warm wood/plaster wall, not renderer black.
- Fog color, scene background, and wall material must blend without a hard edge.

### 7.3 Motion

Do not change the established physical feel without an explicit design review:

- 46 rope particles;
- 3 physics substeps;
- 5 constraint iterations;
- velocity-driven card tilt;
- hover lift;
- elastic pin feedback;
- camera inertia and idle breathing;
- dust drift and lamp flicker.

Performance work should remove allocation and unnecessary rendering rather than reducing visual fidelity.

---

## 8. Motion and Interaction

### 8.1 Timing

| Interaction | Duration |
|---|---:|
| hover/color | 120–180ms |
| panel open/close | 220–320ms |
| card lift/drop | 250–700ms depending on physical action |
| toast | 2200ms visible |
| major intro | 600–900ms |

### 8.2 Easing

- Interface: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Physical card/pin interactions may use GSAP back/elastic easing.
- Avoid springing ordinary text, filters, or form controls.

### 8.3 Keyboard

Required shortcuts remain visible and functional:

- `V`: select;
- `L`: lasso;
- `C`: connect;
- `Space`: pan;
- `Cmd/Ctrl + K`: global search;
- `Cmd/Ctrl + Z`: undo;
- `Cmd/Ctrl + Shift + Z`: redo;
- `Esc`: cancel/close;
- `Delete/Backspace`: remove selected evidence after appropriate confirmation rules.

### 8.4 Focus and accessibility

- Every interactive control requires a visible `:focus-visible` state.
- Do not rely on hover to reveal essential actions.
- Minimum target: 28×28px for dense tools, 36×36px for primary touch actions.
- Text contrast must meet WCAG AA where practical.
- Respect `prefers-reduced-motion` for DOM transitions; the 3D board may reduce idle drift while retaining direct manipulation feedback.

---

## 9. Screen-Specific Direction

### 9.1 Board

- Corkboard remains visually dominant.
- Chrome is dark and quiet.
- Inspector opens on selected evidence.
- Minimap, filters, zoom, undo/redo, and status stay in the bottom bar.

### 9.2 Knowledge graph

- Warm charcoal analysis canvas.
- Nodes retain evidence-status colors.
- Header uses compact dossier metrics.
- Pathfinding and prediction tools look like instrument controls.
- Prediction drawer uses amber provisional styling.

### 9.3 Timeline

- Timeline reads as a chronological evidence ledger.
- Vertical rule resembles a case-file index line.
- Incident anchor is red and explicit.
- Before/after phases use amber and cobalt, respectively.
- Scrubber resembles an instrument rail, not a generic range input.

### 9.4 Anomalies

- Cards are lead sheets, not alarm dashboards.
- Severity is explicit but restrained.
- Recommended action and supporting entities are visually separate.
- Language remains probabilistic and investigative.

### 9.5 Ingestion and resolution

- Staging states are visually distinct: extracted, edited, rejected, approved.
- Source text and generated entities remain side-by-side where space allows.
- Commit action is always explicit and human-controlled.

### 9.6 Assistant

- Drawer resembles a reasoning notebook.
- User and assistant messages differ through border/accent and alignment, not bright chat bubbles.
- Quick actions are compact evidence-query tabs.
- Tables and code remain fully readable.

### 9.7 Reports

- Controls use dark dossier styling.
- Preview may use a light paper sheet within the dark workspace.
- Export/copy actions stay visible and sticky.

### 9.8 Safety and public intelligence

- Preserve the same shell and typography.
- SOS uses red only for the emergency action and dispatch status.
- Credibility scores are framed as transparent triage factors, never truth scores.

---

## 10. Responsive Rules

- Under 1100px: inspector narrows; analytical headers wrap.
- Under 860px: breadcrumbs collapse; rail remains scrollable.
- Under 720px: modal padding decreases; complex two-column workflows stack.
- Fixed chrome must not make primary actions unreachable.
- Horizontal overflow is allowed only for data tables and compact tool strips.

---

## 11. Implementation Contract

Use these shared classes for new or migrated UI:

- `.cb-workspace`: full analytical screen;
- `.cb-workspace-head`: screen title/metrics/tool heading;
- `.cb-surface`: standard analysis panel;
- `.cb-surface-raised`: emphasized analysis panel;
- `.cb-modal-backdrop`: full-screen modal layer;
- `.cb-dossier`: modal/drawer shell;
- `.cb-dossier-head`: modal/drawer header;
- `.cb-dossier-body`: scrollable content region;
- `.cb-dossier-foot`: sticky action row;
- `.cb-eyebrow`: operational section label;
- `.cb-control`: input/select/textarea treatment;
- `.cb-btn`, `.cb-btn-primary`, `.cb-btn-danger`: action hierarchy;
- `.cb-status`: compact labeled state;
- `.cb-metric`: analytical metric tile.

Existing Tailwind utilities may remain for layout and state-specific color, but shared classes own the visual material and interaction finish.

Do not fork new color tokens or modal shells inside individual components.

---

## 12. Visual QA Checklist

Before accepting any design change:

1. Compare at 1440×1000 and 1920×1080.
2. Verify board, graph, timeline, and anomalies.
3. Open search, case switcher, ingestion, resolution, assistant, reports, image analysis, audit, safety, and public intel.
4. Check empty, loading, populated, error, disabled, hover, focus, selected, and destructive states.
5. Confirm no card z-fighting or thread detachment.
6. Pan and zoom beyond the cork frame; no featureless black area may appear.
7. Verify fixed bars do not cover required actions.
8. Verify keyboard shortcuts and Escape behavior.
9. Verify all provenance, confidence, verification, and human-review controls remain present.
10. Run tests, typecheck, production build, and screenshot comparison.

---

## 13. Feature Preservation Checklist

The following capabilities must remain reachable after any redesign:

- 3D corkboard manipulation;
- lasso and group movement;
- manual relationship creation and yarn selection;
- evidence filters and minimap;
- entity inspector editing and provenance;
- graph analytics, pathfinding, communities, and predictions;
- timeline scrubber and before/after comparison;
- anomaly review;
- document ingestion and staged AI extraction;
- identity resolution and merge;
- AI investigator assistant and transcript export;
- report generation and export;
- forensic image analysis and evidence staging;
- global search;
- case creation, switching, ranking, and deletion;
- audit trail;
- public intelligence triage;
- safety contacts and SOS workflow;
- case import/export;
- undo/redo;
- Neo4j status and offline inspection mode.

If a feature is moved or combined, its new location must be obvious, keyboard-accessible where applicable, and documented in this file.

---

## 14. Current Product Architecture

```text
Browser client
├── Casebook shell
│   ├── Three.js corkboard world
│   ├── Knowledge graph canvas
│   ├── Timeline and temporal analysis
│   └── Anomaly analysis
├── Investigation store
│   ├── active case and view state
│   ├── selection, filters, tools, and history
│   └── Neo4j API synchronization
├── Workflow surfaces
│   ├── ingestion and AI staging
│   ├── identity resolution
│   ├── assistant and reports
│   ├── forensic image analysis
│   ├── global search and audit
│   └── safety and public intelligence
└── Local resilience
    ├── IndexedDB case mirror
    ├── append-only audit log
    ├── safety contacts
    └── public intelligence submissions

Next.js server
├── graph API routes
├── Neo4j JavaScript driver
├── extraction and assistant APIs
├── vision analysis API
└── validation and sanitization

Neo4j
├── Case nodes
├── Entity nodes
├── Document nodes
├── TimelineEvent nodes
└── typed evidential relationships
```

Neo4j is the system of record. IndexedDB is a resilience and local-workflow layer, not a competing graph database. When Neo4j is unavailable, the cached investigation may be inspected but graph mutations are disabled.

---

## 15. Data and Projection Contract

### 15.1 Investigation entity

Every entity contains:

- stable ID and case ID;
- semantic entity type;
- display label and aliases;
- open attributes;
- confidence and verification status;
- source provenance;
- board position and visual card type;
- notes and tags;
- creation/update timestamps.

The same entity is projected into:

- a physical evidence card on the board;
- a node in the knowledge graph;
- timeline and anomaly references;
- search results;
- reports, assistant context, and audit records.

Changing one projection must not create a competing copy of the entity.

### 15.2 Investigation relationship

Every relationship contains:

- stable ID and case ID;
- source and target entity IDs;
- typed predicate;
- weight and confidence;
- verification status;
- yarn color;
- temporal validity;
- provenance and investigator notes;
- manual confirmation state.

The same relationship is projected into:

- a physical thread;
- a graph edge;
- chronological events;
- anomaly evidence;
- inspector connection rows;
- generated reports.

### 15.3 Human confirmation

AI extraction, link prediction, image analysis, and public-intelligence promotion create provisional records. Permanent verification requires an explicit investigator action. Visual redesign must not bypass this state transition.

---

## 16. Feature Entry-Point Map

| Capability | Primary entry point | Secondary entry point |
|---|---|---|
| board tools | left rail | V/L/C/Space shortcuts |
| graph | bottom view bar | board relationship context |
| timeline | bottom view bar | timeline popover |
| anomalies | bottom view bar | entity/anomaly links |
| ingest | left rail | public intel promotion |
| identity resolution | left rail | ingest follow-up |
| assistant | left rail | quick action chips |
| reports | left rail | assistant report actions |
| image analysis | left rail | evidence workflow |
| audit | left rail/top bell | mutation receipts |
| public intelligence | left rail | ingestion staging |
| safety | left rail | audit receipt |
| cases | top-left menu | overflow menu |
| global search | top search | Cmd/Ctrl+K |
| import/export/reset | overflow menu | rail export |
| filters | bottom bar | shared board/graph projection |
| undo/redo | bottom bar | keyboard shortcuts |

If a future redesign moves an entry point, update this table in the same change.

---

## 17. State, Error, and Trust Presentation

### 17.1 Loading

- Use an operational status sentence rather than an indeterminate decorative animation alone.
- Keep shell geometry stable to prevent layout shift.
- Long AI operations must state what is being processed.

### 17.2 Empty

- Explain why the region is empty.
- Identify the action that populates it.
- Never substitute fake analytical results.

### 17.3 Error

- State the failing subsystem.
- Preserve inspectable cached data where safe.
- Offer a concrete recovery action.
- Do not silently fall back to simulated AI or fabricated graph data.

### 17.4 Offline

- Show Neo4j status persistently.
- Cached data is read-only.
- Mutating controls must explain why they are unavailable.

### 17.5 AI and predictions

- Label model-derived content.
- Show confidence and provenance.
- Separate supporting evidence from interpretation.
- Require confirmation before verified status.

---

## 18. Definition of Done

A CrimeLens interface change is complete only when:

1. it follows this visual system;
2. no existing capability becomes unreachable;
3. board, graph, timeline, and anomaly projections remain synchronized;
4. provenance, confidence, and verification states remain visible;
5. loading, empty, error, and offline states are designed;
6. keyboard and focus behavior remain functional;
7. card/thread physics remain stable;
8. no z-fighting or featureless background is visible;
9. representative screenshots are compared with the Casebook reference;
10. tests, typecheck, and production build pass;
11. Neo4j health and data counts are verified;
12. this document is updated when the system changes.
