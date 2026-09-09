# 🕵️‍♂️ CrimeLens — AI-Powered Criminal Network Analysis System

[![Production Build](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.185-white?logo=three.js)](https://threejs.org/)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq%20GPT--OSS%20120B%20%2B%20Llama%204%20Scout-orange)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Vitest-38%20Passed-emerald?logo=vitest)](https://vitest.dev/)
[![Storage](https://img.shields.io/badge/Offline--First-IndexedDB-purple)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

> **Turn fragmented investigative evidence into an evolving, searchable, and explainable intelligence knowledge graph.**

---

## 🌟 Executive Overview

**CrimeLens** is a tactical intelligence and criminal network analysis platform designed for law enforcement, cyber-forensics teams, and intelligence analysts. It solves the critical bottleneck where crucial evidence is scattered across First Information Reports (FIRs), interrogation transcripts, Call Detail Records (CDRs), offshore bank transfers, latent fingerprints, and surveillance notes.

### Core Philosophy: Investigative Assistance, Not Automated Accusation
CrimeLens strictly adheres to **Responsible AI standards**:
- AI outputs are framed as **investigative leads, anomalies, and hypotheses** with transparent confidence percentages and verifiable source provenance.
- The system **never declares guilt** or makes definitive accusations of criminality.
- Human-in-the-loop confirmation is required before any AI-extracted entity or connection enters the permanent knowledge graph.
- **Zero Fallbacks**: All analysis executes directly against real models or returns explicit, actionable errors.

---

## 🚀 Key Modules & Capabilities

```
                                  CRIMELENS PLATFORM
   ┌───────────────────────────────────────┼───────────────────────────────────────┐
   ▼                                       ▼                                       ▼
3D TACTICAL CORKBOARD             2D KNOWLEDGE GRAPH ANALYTICS            AI REASONING GATEWAY
- Three.js Noir Canvas            - Dijkstra Shortest Path Solver         - Groq Cloud API Gateway
- Physics-based Verlet Ropes      - Brandes Betweenness Centrality        - Prompt Injection Shields
- Dynamic Catenary Draping        - Louvain Community Clusters            - Human-in-the-Loop Review
- Procedural Evidence Textures    - Jaccard Missing Link Prediction       - Multi-Hypothesis Engine
- Lasso Multi-Select & Pins       - Temporal Scrubbing Engine             - FIR Drafting Assistant
```

### 1. The 3D Tactile Corkboard View (`/`)
Preserves the classic, spatial intuition of the detective murder board:
- **Incremental WebGL Scene Sync**: The Three.js world (scene, camera, textures) is built once per session; entity edits diff-sync into it — drags and edits never rebuild the stage or reset the camera.
- **Live Catenary Thread Draping**: Multi-colored cords (Crimson, Twine, Cobalt, Shadow) re-drape in real time while you drag a pin, via quadratic Bézier catenary recomputation per frame.
- **Procedural Evidence Textures**: High-resolution procedural textures for suspect mugshot cards, crime scene polaroids, classified dossiers with red stamps, folded yellow sticky notes, latent fingerprint cards, and forensic evidence bags.
- **Tactile Camera Rig & Lasso**: Smooth panning, zoom, rubber-band lasso multi-selection with group drag and group delete.

### 2. Analytical 2D Knowledge Graph
High-performance force-directed network diagram with DPR-aware rendering, node dragging, wheel zoom, and canvas panning:
- **Shortest Path Querying**: Computes the most probable link path between any two suspects, displaying intermediate brokers and supporting evidence.
- **Centrality Heatmaps**: Dynamically sizes nodes by Degree Centrality and identifies critical intermediaries via Betweenness Centrality.
- **Deterministic Community Detection**: Weighted label-propagation modularity clustering partitions the network into syndicate cells with stable, reproducible results across runs.
- **Topological Link Prediction**: Surfaces covert, unrecorded associations between persons of interest using Jaccard Similarity, Adamic-Adar, and Resource Allocation indices; staged links land as `predicted` edges requiring investigator confirmation.
- **Shared Filter Pipeline**: The board's evidence-type filters apply to the graph projection too — both views are projections of the same investigation state.

### 3. Chronological Timeline & Before/After Comparison
- **Data-Derived Chronology**: Events are derived live from relationship timestamps (`validFrom` / provenance), ingested documents, the case incident anchor, and committed AI extraction events — never hardcoded demo content.
- **Temporal Network Scrubber**: A slider across the full case chronology showing the network state (active nodes, active edges, dominant hub, density) as of any point in time.
- **Pre-Incident vs Post-Incident Comparison**: Phase statistics (link counts, key hubs, dominant activity categories) computed from the filtered graph.

### 4. AI Document Ingestion & Staging Area
- Ingests unstructured FIRs, interrogation transcripts, CDR dumps, and financial transaction sheets.
- Server-side parsing via **Groq Cloud** in strict JSON schema mode.
- **Prompt Injection Hardening**: Sanitizes and defangs adversarial jailbreak instructions hidden inside seized documents.
- **Human-in-the-Loop Review**: Extracted entities, relationships, and chronology events are staged in an interactive review modal where investigators verify, edit confidence, or reject false leads before graph commit.
- **Duplicate-Resistant Commit**: Extracted labels resolve against existing entities via alias and fuzzy (≥ 0.92 similarity) matching; new cards get collision-free board placement, and the source document is persisted with its extraction counts as a chain-of-custody record.

### 5. Entity Resolution & Identity Disambiguation
- Discovers duplicate suspects recorded under slight spelling variations or aliases (e.g., *"Rahul Sharma"* vs *"Rahul K. Sharma"*).
- Multi-signal similarity scoring: Levenshtein string distance, token abbreviations, shared phone numbers, vehicle registrations, and address matching.
- Highlights conflicting attributes (e.g. incompatible reported ages) and enables one-click merging or alias linking.
- **Provenance-Preserving Merges**: Merging two identities moves every relationship intact (IDs, predicates, confidence, source provenance) instead of recreating it, unions attributes, and records the merge in the audit trail.

### 6. Suspicious Pattern & Anomaly Detection
Rule and graph heuristics detecting — all anchored to the case incident date when one is set:
- **Rapid Financial Layering**: Structured hopping (Entity A → B → C) through intermediary accounts, with leg-timing analysis and mirrored-route deduplication.
- **Communication Bursts**: Surges in call frequency overlapping the 72-hour pre-incident window; temporally unverifiable bursts are flagged at reduced severity with an explicit caveat rather than silently asserted.
- **Geographic Anomalies**: Suspect presence geolocated in the immediate incident sector during the ±24h breach window.
- **Offshore Shell Structures**: Nominee corporate vehicles with overseas registrations.

### 7. AI Investigator Assistant & Multi-Hypothesis Generator
- Context-aware intelligence assistant grounded strictly in current case evidence.
- **Rolling Conversation Memory**: The last 8 exchanges are re-sanitized and sent with each query, so follow-up questions work.
- **Rich Markdown Chat Interface**: Powered by `react-markdown` and `remark-gfm` supporting tables, bold/italic text, code blocks, and structured lists.
- **One-Click Quick Action Chips**: Summarize dossier, draft FIR, generate alternative hypotheses, and probe missing links.
- **Session Transcript Export**: Download full interrogation and reasoning logs as timestamped `.md` files.
- Formulates **multiple alternative hypotheses** with supporting and contradicting observations.
- Generates statutory FIR drafts and suggests potentially applicable sections under the **Bharatiya Nyaya Sanhita (BNS)** and Prevention of Money Laundering Act (PMLA) for prosecutor review.

### 8. Tactile Audio Feedback & Immersive Noir Atmosphere
- In-browser procedural Web Audio synthesizer providing realistic physical feedback:
  - Metallic pin taps when establishing evidence coordinates.
  - Plucking/snip sounds when connecting or cutting yarn threads.
  - Paper rustling cues when picking up and repositioning evidence cards.
- Dark crime-noir aesthetic adhering to strict investigative color coding and typography.

### 9. Case Management & Case Prioritization Ranking
- Create, switch, and delete multi-case dossiers without page reloads; the active case persists across sessions via localStorage.
- **Configurable prioritization engine**: a transparent weighted score (40% declared risk severity + 20% network entity density + 25% open-anomaly load + 15% urgency decay from the incident date) ranks the portfolio, with a per-case factor breakdown available to supervisors.

### 10. Forensic Image & Object Analysis
- **Real multimodal inference**: uploaded evidence images (CCTV stills, surveillance photos, forensic macro shots) are analyzed by Groq's vision-capable Llama 4 Scout model — zero simulated detections.
- Classification, description, vehicle make/model estimation, and license plate reading (only when genuinely legible) with confidence intervals and explicit uncertainty statements.
- Results are staged for investigator review and pinned as `ai_inferred` forensic evidence requiring confirmation.

### 11. Audit Trail & Chain of Custody
- Immutable audit log recording every investigator action: case lifecycle, entity and relationship CRUD, identity merges, AI extraction approvals, document ingestion, predicted-link confirmations, report generation, imports/exports, intel triage, and SOS dispatches.
- Filterable by action type with full timestamps.

### 12. Offline-First IndexedDB Storage & Productivity Rig
- All cases, dossiers, nodes, relationships, documents, timeline events, tips, safety contacts, and audit logs persist locally in **IndexedDB** (`crimelens_investigation_db`).
- Complete case backup and cross-team sharing via `.crimelens.json` **export and import** — imports are structurally validated (including relationship referential integrity) and re-scoped on identity collision so live cases are never overwritten.
- **Undo/Redo** (⌘Z / ⌘⇧Z) across graph mutations with database reconciliation.
- Global search (⌘K) across entities, connections, and ingested documents; ESC closes modals; V/C/L/Space tool shortcuts.
- Operates seamlessly in air-gapped or low-connectivity tactical environments.

### 13. Public Intelligence & Tip Triage
- Citizen tips and witness submissions persist in IndexedDB with a **transparent credibility heuristic** (specificity signals like plates/phones/times plus corroboration against existing case entities), shown as an inspectable factor breakdown — a triage aid, never a verdict.
- Investigators verify or dismiss tips and promote them into the AI extraction staging pipeline.

### 14. Women Safety & Emergency Escalation
- Trusted well-wisher circle registration, persisted locally.
- One-touch emergency SOS simulation dispatching geolocated alerts (via the browser Geolocation API, with an explicit note when unavailable) to trusted contacts and the 1091 helpline, producing a per-channel dispatch receipt and an audit entry in the active case.

---

## 📖 In-Depth Technical Specification
For the complete mathematical formulations, algorithm pseudocode, graph complexity analyses, and prompt design schemas, refer to [`technical.md`](./technical.md).

---

## 📊 Scalability Benchmarks & Test Suite

CrimeLens features an automated test suite across unit, integration, and stress tiers:

```bash
# Run all tests
pnpm test
```

### Verified Test Results (38 tests):
- `tests/unit/graphAlgorithms.test.ts` (5 tests): Shortest path, degree, betweenness centrality, community detection, and link prediction.
- `tests/unit/identityMatcher.test.ts` (4 tests): Levenshtein distance, abbreviations, phone/plate matching, and conflict flagging.
- `tests/unit/anomalyDetectors.test.ts` (5 tests): Rapid financial hopping, communication bursts (in/out of the pre-incident window), and geographic anomaly checks with and without an incident anchor.
- `tests/unit/sanitize.test.ts` (3 tests): Prompt injection neutralization and fallback-free schema parsing.
- `tests/unit/casePrioritization.test.ts` (4 tests): Scoring order, factor breakdown, density sensitivity, and score bounds.
- `tests/unit/timelineDerivation.test.ts` (5 tests): Chronology derivation, event categorization, as-of network state scrubbing, and pre/post phase statistics.
- `tests/unit/tipCredibility.test.ts` (4 tests): Heuristic bounds, specificity rewards, and entity corroboration.
- `tests/unit/importBundle.test.ts` (5 tests): Bundle validation, referential integrity rejection, and collision re-scoping.
- `tests/stress/graphScalability.test.ts` (3 tests): Synthetic graph scalability benchmarks:
  - **100 Nodes**: Computed in < 20ms.
  - **1,000 Nodes**: Full shortest path and community detection in < 150ms.
  - **5,000 Nodes**: Stress pathfinding and degree allocation without memory degradation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Language** | TypeScript 5.9 (Strict Type Checking) |
| **Styling** | Tailwind CSS 3.4 (Tactical Noir Dark Mode) |
| **3D Engine** | Three.js r185, GSAP 3.15, Incremental Scene Diff Sync |
| **AI / LLM** | Groq Cloud SDK — `openai/gpt-oss-120b` (reasoning), `openai/gpt-oss-20b` (fast), `meta-llama/llama-4-scout-17b-16e-instruct` (forensic vision) |
| **Offline DB** | IndexedDB via `idb` v8 (8 object stores) + LocalStorage (active case) |
| **Testing** | Vitest 3.2, JSDOM, React Testing Library |
| **Deployment** | Vercel Edge / Serverless Production |

---

## ⚡ Quickstart & Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/Abhinav-Prabhakar/CrimeLens.git
cd CrimeLens
pnpm install
```

### 2. Configure Environment Secrets
Create a `.env.local` file in the root directory (this file is gitignored):
```bash
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to access CrimeLens.

### 4. Build for Production
```bash
pnpm build
pnpm start
```

---

## 🔒 Security & Privacy Architecture

1. **Zero Secret Leakage**: The Groq API key is maintained strictly in server-side environment variables and is never exposed in client bundles or git commits.
2. **Prompt Injection Defense**: All ingested documents are treated as untrusted text, wrapped in isolated boundary tags, and scanned for adversarial injection patterns before passing to LLMs.
3. **Audit Log Trail**: Every investigative action (entity creation, connection approval, identity merge, report export) is stamped with an immutable audit entry in IndexedDB.

---

## ⚖️ Ethical & Responsible AI Notice

CrimeLens is designed strictly as an **investigative decision-support tool** for authorized personnel. It does not replace human judicial or investigative discretion. All machine-generated outputs, probability ratings, and network clusters must be corroborated with primary forensic evidence.

---

## 📜 License

Distributed under the MIT License. Developed for Smart India Hackathon (SIH) 2026.
