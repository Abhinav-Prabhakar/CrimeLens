# CrimeLens — Technical Architecture & Algorithmic Specification

> **Deep-dive technical documentation of CrimeLens: systems architecture, mathematical formulations, graph algorithms, AI pipelines, and storage engines.**

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Technology Stack & System Topology](#2-technology-stack--system-topology)
3. [Tactile 3D Corkboard & Verlet Physics Engine](#3-tactile-3d-corkboard--verlet-physics-engine)
   - [3.1 Verlet Thread Solver](#31-verlet-thread-solver)
   - [3.2 Procedural Texture Synthesis](#32-procedural-texture-synthesis)
   - [3.3 Camera Rig & Raycasting Interaction](#33-camera-rig--raycasting-interaction)
4. [Graph Analytics Engine & Algorithmic Formulations](#4-graph-analytics-engine--algorithmic-formulations)
   - [4.1 Shortest Path Querying (Dijkstra Cost Optimization)](#41-shortest-path-querying-dijkstra-cost-optimization)
   - [4.2 Degree Centrality](#42-degree-centrality)
   - [4.3 Betweenness Centrality (Brandes' Algorithm)](#43-betweenness-centrality-brandes-algorithm)
   - [4.4 Community Detection (Modularity & Label Propagation)](#44-community-detection-modularity--label-propagation)
   - [4.5 Topological Link Prediction (Jaccard, RA, Adamic-Adar)](#45-topological-link-prediction-jaccard-ra-adamic-adar)
5. [Entity Resolution & Identity Disambiguation](#5-entity-resolution--identity-disambiguation)
   - [5.1 Levenshtein Matrix Distance](#51-levenshtein-matrix-distance)
   - [5.2 Initial & Anagram Heuristics](#52-initial--anagram-heuristics)
   - [5.3 Multi-Signal Confidence Scoring & Conflict Penalization](#53-multi-signal-confidence-scoring--conflict-penalization)
6. [Suspicious Pattern & Behavioral Anomaly Detection](#6-suspicious-pattern--behavioral-anomaly-detection)
   - [6.1 Rapid Financial Layering (A → B → C)](#61-rapid-financial-layering-a--b--c)
   - [6.2 Pre-Incident Communication Burst](#62-pre-incident-communication-burst)
   - [6.3 Geographic Scene Proximity Anomaly](#63-geographic-scene-proximity-anomaly)
   - [6.4 Offshore Shell Structuring](#64-offshore-shell-structuring)
7. [AI Intelligence Gateway & Zero-Fallback Architecture](#7-ai-intelligence-gateway--zero-fallback-architecture)
   - [7.1 Groq Cloud LLM Integration](#71-groq-cloud-llm-integration)
   - [7.2 Prompt Injection Neutralization & Sanitization](#72-prompt-injection-neutralization--sanitization)
   - [7.3 Zero-Fallback Enforcement & Strict Schema Parsing](#73-zero-fallback-enforcement--strict-schema-parsing)
   - [7.4 Human-in-the-Loop Confirmation Staging Area](#74-human-in-the-loop-confirmation-staging-area)
   - [7.5 Multi-Hypothesis Explanations & Legal Drafting Aids](#75-multi-hypothesis-explanations--legal-drafting-aids)
   - [7.6 Temporal Analysis Engine](#76-temporal-analysis-engine)
   - [7.7 Case Prioritization Engine](#77-case-prioritization-engine)
   - [7.8 Tip Credibility Triage](#78-tip-credibility-triage)
8. [Neo4j Graph Storage Engine & Local Resilience Layer](#8-neo4j-graph-storage-engine--local-resilience-layer)
   - [8.1 Property Graph Model & Constraints](#81-property-graph-model--constraints)
   - [8.2 Graph API Gateway](#82-graph-api-gateway)
   - [8.3 Reactive Store & Write-Through Cache](#83-reactive-store--write-through-cache)
   - [8.4 Local Resilience Stores (IndexedDB)](#84-local-resilience-stores-indexeddb)
   - [8.5 Immutable Audit Trail & Chain of Custody](#85-immutable-audit-trail--chain-of-custody)
   - [8.6 Case Bundle Export / Import](#86-case-bundle-export--import)
9. [Automated Verification & Scalability Benchmarks](#9-automated-verification--scalability-benchmarks)
   - [9.1 Test Pyramid](#91-test-pyramid)
   - [9.2 Graph Scalability Stress Benchmarks (up to 5,000 nodes)](#92-graph-scalability-stress-benchmarks-up-to-5000-nodes)
10. [Production Deployment & Security Guarantees](#10-production-deployment--security-guarantees)

---

## 1. Architectural Overview

CrimeLens is an investigative intelligence platform designed to eliminate data fragmentation across First Information Reports (FIRs), interrogation transcripts, Call Detail Records (CDRs), financial ledgers, and forensic physical evidence.

The architecture operates on a **dual-view synchronized state model** backed by a **Neo4j property graph as the system of record**:
- **Spatial Intuition View**: A 3D tactile detective corkboard rendered via WebGL/Three.js with realistic Verlet yarn physics, pins, and polaroids.
- **Analytical Intelligence View**: An in-browser topological knowledge graph executing centrality heatmaps, community detection, shortest-path calculation, and link prediction.

Both views read from and write to a single source of truth: the **Neo4j knowledge graph**, accessed through server-side Next.js API routes and synchronized with serverless **Groq Cloud AI APIs**. A write-through IndexedDB cache mirrors the authoritative state for resilient local boot, while the append-only audit trail, public intel submissions, and safety contacts remain deliberately local stores.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BROWSER CLIENT                                       │
│                                                                                        │
│  ┌───────────────────────────────┐                  ┌───────────────────────────────┐  │
│  │   3D Tactical Corkboard       │                  │   2D Force Knowledge Graph    │  │
│  │  (Three.js, Verlet Ropes,     │◄─ Bi-directional ┼─►│  (Canvas Force Graph,        │  │
│  │   Pins, Textures, Drag/Zoom)  │    State Sync    │   Louvain clusters, Paths)    │  │
│  └──────────────┬────────────────┘                  └───────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 ▼                                                   ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                  Unified Investigation State & Reactive Store                    │  │
│  │  (Active Case, Graph Projection, Filter Pipeline, History Stack Undo/Redo)       │  │
│  └──────────────────────────────┬───────────────────────────────┬───────────────────┘  │
│                                 │                               │                      │
│                                 ▼                               ▼                      │
│  ┌──────────────────────────────┐              ┌──────────────────────────────────┐    │
│  │  In-Browser Analytics Engine │              │   Local Resilience Layer         │    │
│  │  - Dijkstra Shortest Path    │              │  - IndexedDB write-through cache │    │
│  │  - Degree & Betweenness      │              │  - Append-only audit chain       │    │
│  │  - Louvain Community Detect  │              │  - Intel tips & safety contacts  │    │
│  │  - Link Prediction (Jaccard) │              │  - Export / Import JSON & PDF    │    │
│  │  - Temporal Diff Engine      │              └──────────────────────────────────┘    │
│  └──────────────────────────────┘                                                      │
└────────────────────────┬───────────────────────────────────────────────────────────────┘
                         │ HTTPS (REST / Serverless)
                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                NEXT.JS BACKEND RUNTIME                                 │
│                                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │  Document Ingestion API │  │   Graph API Gateway      │  │ AI Intelligence       │  │
│  │  - Input sanitization   │  │  - /api/graph/* routes   │  │ Gateway               │  │
│  │  - Injection shielding  │─►│  - Neo4j driver v6       │◄─│ - Groq LLMs + vision  │  │
│  │  - Multi-doc parser     │  │  - Constraint bootstrap  │  │ - Zero fallbacks      │  │
│  └─────────────────────────┘  └────────────┬─────────────┘  └───────────────────────┘  │
│                                            │ Bolt                                       │
└────────────────────────────────────────────┼────────────────────────────────────────────┘
                                             ▼
                       ┌──────────────────────────────────────┐
                       │   NEO4J PROPERTY GRAPH (SOR)         │
                       │  (:Case)-[:HAS_ENTITY]->(:Entity)    │
                       │  (:Entity)-[:CALLED|OWNS|...]->(...) │
                       │  (:Case)-[:HAS_DOCUMENT|HAS_EVENT]-> │
                       └──────────────────────────────────────┘
```

---

## 2. Technology Stack & System Topology

| Subsystem | Technology | Version | Purpose |
|---|---|---|---|
| **Core Framework** | Next.js (App Router, Turbopack) | 16.3.4 | Serverless API routes, layout rendering, client hydration |
| **Language** | TypeScript | 5.9.3 | Strict end-to-end type safety across schemas and algorithms |
| **UI & Styling** | Tailwind CSS | 3.4.19 | Tactical Noir Dark Mode (`#0c0a09`), monospace typography |
| **Icons** | Lucide React | 1.43.0 | Minimalist tactical UI iconography |
| **3D Rendering** | Three.js | 0.185.1 | WebGL corkboard stage, perspective camera rig, lighting |
| **Animation Engine** | GSAP | 3.15.0 | Camera interpolation and smooth stage damping |
| **AI LLM Gateway** | Groq Cloud SDK | 1.6.0 | Sub-second inference (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, Llama 4 Scout vision) |
| **Graph Database** | Neo4j (Community / Aura) via `neo4j-driver` | 2025.x / driver 6.2 | System of record for cases, entities, relationships, documents, timeline events |
| **Local Layer** | IndexedDB via `idb` | 8.0.3 | Write-through cache, append-only audit chain, intel tips, safety contacts |
| **Validation** | Zod | 4.5.4 | Strict schema definition and LLM output parsing |
| **Test Suite** | Vitest + JSDOM | 3.2.7 | Fast unit, stress, and scalability benchmarking |

---

## 3. Tactile 3D Corkboard & Verlet Physics Engine

The 3D corkboard ([`InvestigationCorkboard.tsx`](file:///Users/abhinav/Projects/CrimeLens/src/components/board/InvestigationCorkboard.tsx)) preserves the classic murder board tactile visual language.

### 3.0 Incremental Scene Synchronization
The WebGL world is constructed **once per session** (scene graph, perspective camera, lighting, cork texture) and never torn down for data changes. A diff-sync layer reconciles React state into the Three.js scene:
- **Card add/update/remove**: new entities spawn pinned `THREE.Group` cards; content changes (label, type, confidence, status) regenerate only that card's procedural texture via a signature check; deletes dispose the card's GPU resources.
- **Camera persistence**: edits, drags, and ingestions no longer reset the camera — positions, zoom, and orbit survive every mutation.
- **Thread sync**: relationship edges are keyed by ID; thread color changes update the line material in place; endpoint moves re-drape the catenary.

### 3.1 Verlet Thread Solver & Live Catenary Draping
Rather than rendering static straight lines between evidence pins, CrimeLens employs a physics-based **Verlet Integration & Catenary Draping Curve**:

Given anchor pin positions $\mathbf{P}_1 = (x_1, y_1, z_1)$ and $\mathbf{P}_2 = (x_2, y_2, z_2)$:
1. Calculate Euclidean span $d = \|\mathbf{P}_2 - \mathbf{P}_1\|$.
2. Calculate sag depth $s = \min\left(6.0, 0.18 \cdot d + 0.8\right)$.
3. Compute midpoint $\mathbf{M} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{2} - (0, s, 0.1)$.
4. Construct a Quadratic Bézier Spline $\mathbf{B}(t) = (1-t)^2 \mathbf{P}_1 + 2(1-t)t \mathbf{M} + t^2 \mathbf{P}_2$ sampled across 24 vertices (written in-place into the line's position buffer).
5. While a card is being dragged, every touching thread **re-drapes per animation frame**, so cords follow the pin in real time.
6. Render dynamic threads in four authentic investigative cord pigments:
   - **Crimson Red (`0xb01722`)**: Suspect links and critical associations.
   - **Twine Tan (`0xc9a76a`)**: Movement, travel, and logistics.
   - **Cobalt Blue (`0x2f5f9e`)**: Financial transactions and shell accounts.
   - **Shadow Noir (`0x22201d`)**: Background surveillance and unverified leads.

### 3.2 Procedural Texture Synthesis
To eliminate external asset network dependencies and guarantee offline air-gapped usability, all textures are procedurally synthesized on HTML5 Canvases at runtime:
- **Cork Grain Texture**: Canvas noise generator depositing 45,000 micro-speckles of randomized organic pigment (`rgba(42,35,28,0.7)` and `rgba(15,12,10,0.6)`) wrapped with `THREE.RepeatWrapping` (6x4 tiling).
- **Classified Dossier Stamp**: Canvas drawing context creating distressed double-bordered `CONFIDENTIAL` red ink stamps.
- **Sticky Note Shading**: Chamfered corner fold polygon with cast drop shadows.
- **Polaroid Frames**: Realistic borders with photo apertures and handwritten monospaced typewriter labels.

### 3.3 Camera Rig, Raycasting Interaction & Lasso Multi-Select
- **Perspective Camera**: 30° Field of View with clamped wheel zoom (z ∈ [30, 150]) and drag panning.
- **Raycaster Object Picking**: Translates normalized device coordinates $(x_{\text{ndc}}, y_{\text{ndc}})$ into 3D world space, intersecting against card geometry bounds while projecting drag movements along a virtual $Z=0$ plane.
- **Lasso Tool**: Pointer strokes on empty cork (with the lasso tool active) are unprojected onto the board plane and rendered as an amber polyline; on release, a ray-casting point-in-polygon test selects every card inside the loop, enabling group drag and group delete.
- **Group Drag**: grabbing a card inside the current multi-selection moves the whole group with per-card offsets; positions commit to IndexedDB on pointer-up.

### 3.4 2D Knowledge Graph Rendering & Force Simulation
The analytical view ([`KnowledgeGraphView.tsx`](file:///Users/abhinav/Projects/CrimeLens/src/components/graph/KnowledgeGraphView.tsx)) runs a custom velocity-damped force simulation in a `requestAnimationFrame` loop:
- **Forces**: pairwise Coulomb repulsion $F = \min(k_{rep}/d^2, 18)$, Hookean springs along edges toward a 115 px rest length, weak center gravity, and exponential alpha decay ($\alpha \leftarrow 0.985\,\alpha$) reheated on data changes and node drags.
- **Coordinate Integrity**: the canvas is DPR-aware (device pixel ratio up to 2) and sized to its container; pointer coordinates are inverse-mapped through the view transform $(t_x, t_y, k)$ before hit-testing, so selection is exact at any zoom, pan, or window size.
- **View Transform**: wheel zoom is anchored at the cursor; empty-canvas drag pans; node drag pins the node during the gesture.
- **Shared Filter Pipeline**: the board's `filterTypes` projection applies to nodes and edges identically in both views.

---

## 4. Graph Analytics Engine & Algorithmic Formulations

All graph analytics are implemented in pure TypeScript ([`algorithms.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/algorithms.ts), [`betweenness.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/algorithms.ts), [`louvain.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/louvain.ts), and [`linkPrediction.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/linkPrediction.ts)), running client-side without external dependencies.

### 4.1 Shortest Path Querying (Dijkstra Cost Optimization)
Identifies the most probable chain of custody or communication between Suspect $A$ and Suspect $B$.

**Edge Weight Formulation**:
Instead of simple hop counts, edge traversal cost $c(e)$ is inversely proportional to relationship confidence $\text{conf}(e) \in [0.1, 1.0]$:
$$c(e) = \frac{1}{\max(0.1, \text{conf}(e))}$$

**Algorithm**:
```text
Initialize dist[v] = ∞ for all v ∈ V, dist[start] = 0.
Priority Queue Q ← V.
While Q is not empty:
    u ← extract_min(Q)
    If u == target: break
    For each neighbor v of u:
        cost ← 1 / max(0.1, rel.confidence)
        alt ← dist[u] + cost
        If alt < dist[v]:
            dist[v] ← alt
            prev[v] ← { node: u, rel: bestRel }
```

### 4.2 Degree Centrality
Measures local connectivity density.
For node $v \in V$:
$$\mathrm{deg}(v) = |\{u \in V \mid (u, v) \in E\}|$$
$$\mathrm{deg}_{\mathrm{norm}}(v) = \frac{\mathrm{deg}(v)}{|V| - 1}$$

### 4.3 Betweenness Centrality (Brandes' Algorithm)
Identifies **critical network bridges, brokers, and cut-vertices** who control information flow between disconnected criminal factions.

**Mathematical Formulation**:
$$C_B(v) = \sum_{s \neq v \neq t \in V} \frac{\sigma_{st}(v)}{\sigma_{st}}$$
where $\sigma_{st}$ is the total number of shortest paths from $s$ to $t$, and $\sigma_{st}(v)$ is the number of those paths that pass through $v$.

**Brandes' Optimization ($O(|V| \cdot |E|)$ time)**:
Maintains path counts $\sigma[w]$ and dependencies $\delta[v]$ using BFS queues and stacks:
$$\delta_{s\bullet}(v) = \sum_{w: v \in P_s(w)} \frac{\sigma_s(v)}{\sigma_s(w)} \left(1 + \delta_{s\bullet}(w)\right)$$

Normalized for undirected graphs:
$$C_B^{\mathrm{norm}}(v) = \frac{C_B(v)}{(|V|-1)(|V|-2)}$$

### 4.4 Community Detection (Modularity & Label Propagation)
Partitions the criminal network into syndicate cells, gangs, and operational clusters.

**Modularity Optimization Objective**:
Maximizes the Newman-Girvan modularity index $Q$:
$$Q = \frac{1}{2m} \sum_{i,j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$
where:
- $A_{ij}$ is the adjacency weight between node $i$ and node $j$.
- $k_i = \sum_j A_{ij}$ is the degree sum of node $i$.
- $m = \frac{1}{2} \sum_{i,j} A_{ij}$ is the total network edge weight.
- $\delta(c_i, c_j) = 1$ if node $i$ and node $j$ belong to the same community, else $0$.

**Algorithm**:
Deterministic weighted label propagation (seeded mulberry32 LCG shuffle for symmetry breaking — the same case always yields the same partition), converging in ≤ 20 iterations:
1. Initialize each node in its own singleton community $c_u = u$.
2. In a seeded-shuffle sequence, update node community to the label with maximal weighted neighbor endorsement:
   $$c_u \leftarrow \arg\max_c \sum_{v \in N(u), c_v = c} w(u, v)$$
3. Terminate when community assignment delta falls below threshold or max iterations reached.
4. Compact community IDs into dense indices $0 \dots K-1$.

### 4.5 Topological Link Prediction (Jaccard, RA, Adamic-Adar)
Discovers covert, unrecorded associations between persons of interest who share common associates, burner devices, or locations.

For non-adjacent node pair $(u, v) \notin E$ with common neighbor set $\Gamma(u, v) = N(u) \cap N(v)$:

1. **Jaccard Similarity Coefficient**:
   $$S_{\mathrm{Jaccard}}(u, v) = \frac{|\Gamma(u, v)|}{|N(u) \cup N(v)|}$$

2. **Resource Allocation (RA) Index**:
   Penalizes high-degree mutual contacts to reward niche mutual connections:
   $$S_{\mathrm{RA}}(u, v) = \sum_{z \in \Gamma(u, v)} \frac{1}{|N(z)|}$$

3. **Adamic-Adar (AA) Index**:
   Logarithmic degree attenuation:
   $$S_{\mathrm{AA}}(u, v) = \sum_{z \in \Gamma(u, v)} \frac{1}{\log |N(z)|}$$

4. **Composite Prediction Score**:
   $$S_{\mathrm{composite}} = \min\left(0.98, \; 0.40 \cdot S_{\mathrm{Jaccard}} + 0.35 \cdot \min(1, S_{\mathrm{RA}}) + 0.25 \cdot \min\left(1, \frac{S_{\mathrm{AA}}}{3}\right)\right)$$

---

## 5. Entity Resolution & Identity Disambiguation

Entity resolution ([`identityMatcher.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/resolution/identityMatcher.ts)) determines whether two disparate records (e.g. *"Rahul Sharma, Mumbai"* and *"R. K. Sharma"*) represent the same individual.

### 5.1 Levenshtein Matrix Distance
Computes edit distance $D(i, j)$ for strings $s_1$ and $s_2$:
$$D(i, j) = \min \begin{cases}
D(i-1, j) + 1 \\
D(i, j-1) + 1 \\
D(i-1, j-1) + \mathbb{I}(s_1[i] \neq s_2[j])
\end{cases}$$
Normalized similarity score:
$$\mathrm{Sim}_{\mathrm{Lev}}(s_1, s_2) = 1 - \frac{D(|s_1|, |s_2|)}{\max(|s_1|, |s_2|)}$$

### 5.2 Initial & Anagram Heuristics
Tokenizes names into first, middle, and surname components. If surnames have $\mathrm{Sim}_{\mathrm{Lev}} > 0.85$ and first initials match ($s_1[0] = s_2[0]$), flags abbreviation equivalence with a baseline similarity of $0.45$.

### 5.3 Multi-Signal Confidence Scoring & Conflict Penalization
- **Phone Number Match**: Strips non-digits; matching suffix/exact sequence adds $+0.45$. Mismatched verified numbers penalize $-0.15$.
- **Vehicle Plate Match**: Normalized alphanumeric equality adds $+0.50$.
- **Geographic Proximity**: Matching jurisdiction adds $+0.25$.
- **Disparate Age Conflict**: Verified age difference $> 4$ years incurs a $-0.20$ penalty.

---

## 6. Suspicious Pattern & Behavioral Anomaly Detection

Pattern detection ([`anomalyDetectors.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/patterns/anomalyDetectors.ts)) executes graph rule traversal across nodes and edges:

### 6.1 Rapid Financial Layering (A → B → C)
Finds directed sequences of fund transfers where relationship predicate is `TRANSFERRED_FUNDS`:
$$\exists \, e_1, e_2 \in E \quad \text{such that} \quad \mathrm{target}(e_1) = \mathrm{source}(e_2) \quad \text{and} \quad \mathrm{source}(e_1) \neq \mathrm{target}(e_2)$$
Mirrored reports of the same route are deduplicated via a sorted edge-ID pair key. When both legs carry timestamps, the inter-leg gap is computed: gaps ≤ 72 h retain `high` severity ("consistent with rapid layering"); longer gaps are downgraded to `medium` with the measured separation stated.

### 6.2 Pre-Incident Communication Burst
Filters communication relationships (`CALLED`, `COMMUNICATED_WITH`) where interaction frequency $w \ge 8$ **and** the edge's evidential window $[\text{validFrom}, \text{validTo}]$ overlaps the $[\text{incident} - 72\text{h}, \text{incident} + 24\text{h}]$ window. Edges falling outside the window are not flagged; edges with no temporal data are flagged at `medium` severity with an explicit "temporal data unavailable" caveat — never silently asserted as pre-incident.

### 6.3 Geographic Scene Proximity Anomaly
Flags relationships where predicate is `LOCATED_AT` connecting a person of interest to the physical sector of the crime scene **overlapping the ±24h incident window**. Without an incident anchor (or without edge timestamps) the anomaly is downgraded to `medium` severity with an explicit caveat.

### 6.4 Offshore Shell Structuring
Detects organizations tagged as non-operational offshore entities registered in zero-tax corporate registries (e.g. BVI, Tortola, Seychelles) that disburse capital immediately after receipt.

---

## 7. AI Intelligence Gateway & Zero-Fallback Architecture

### 7.1 Groq Cloud LLM Integration
- **Primary Model**: `openai/gpt-oss-120b` (high-parameter reasoning for multi-step entity extraction, hypothesis generation, and the investigator assistant).
- **Fast Model**: `openai/gpt-oss-20b` (sub-second conversational inference).
- **Vision Model**: `meta-llama/llama-4-scout-17b-16e-instruct` (multimodal forensic image analysis via the `/api/vision` endpoint).
- **Latency**: End-to-end execution typically under 400ms (text); image analysis depends on upload size.

### 7.1.1 Forensic Vision Pipeline (`/api/vision`)
1. Client uploads an image (≤ 4 MB, drag-and-drop or file picker) and sends it as base64.
2. The server wraps it into a multimodal chat completion with a strict-JSON forensic system prompt (classification, factual description, plate reading **only when genuinely legible**, vehicle estimate, forensic markings, confidence, and a mandatory uncertainty statement).
3. Output is Zod-validated into canonical fields; any failure (missing key, oversized payload, model error, unparsable or schema-invalid output) returns an explicit HTTP 4xx/5xx — **zero simulated detections**.
4. Results are staged in the modal for investigator editing before being pinned as `ai_inferred` evidence with forensic provenance.

### 7.2 Prompt Injection Neutralization & Sanitization
Document text from seized suspect phones or anonymous tips is inherently untrusted. The sanitization layer ([`sanitize.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/ai/sanitize.ts)):
1. Truncates inputs to 60,000 characters to prevent buffer exhaustion.
2. Scans for adversarial jailbreak regex signatures (`ignore all previous instructions`, `system prompt`, `<|im_start|>`, `[INST]`).
3. Replaces matches with `[DEFANGED_INJECTION_ATTEMPT]`.
4. Wraps user text inside strict structural isolation boundary tags (`<investigative_text_to_analyze>`).

### 7.3 Zero-Fallback Enforcement & Strict Schema Parsing
- **Zero Fallbacks**: All heuristic fallback approximations, regex triple extractors, and offline dummy strings have been removed.
- **Fail-Fast Semantics**: If the API key is unconfigured, Groq times out, or output is unparsable, the system returns an explicit HTTP 500 with the exact error details.
- **Robust Normalization**: The raw JSON parser safely normalizes LLM string variations into canonical system enums (`normalizeEntityType`, `normalizeVisualType`, `normalizePredicate`).

### 7.4 Human-in-the-Loop Confirmation Staging Area
No extracted entity or relationship is ever injected directly into the knowledge graph. Extracted items are placed in an interactive staging modal ([`DocumentIngestModal.tsx`](file:///Users/abhinav/Projects/CrimeLens/src/components/ingestion/DocumentIngestModal.tsx)) where the investigator must verify, adjust confidence, or uncheck false leads before committing. The commit pipeline then:
1. **Resolves duplicates**: each extracted label is matched against existing entities by exact label, alias, then same-type fuzzy similarity (normalized Levenshtein ≥ 0.92); matches fold newly learned aliases onto the existing node instead of creating duplicates.
2. **Places cards collision-free**: 80 random samples with a ≥ 13-unit separation check, falling back to an expanding spiral ring.
3. **Persists the source document** as an `IngestedDocument` chain-of-custody record with extraction counts.
4. **Persists approved chronology events** (from the extraction's `timelineEvents`) into the `timeline_events` store; undated events are anchored to ingestion time and explicitly flagged.
5. **Writes audit entries** for `document_ingested` and `ai_extraction_approved`.

### 7.5 Multi-Hypothesis Explanations & Legal Drafting Aids
For ambiguous events, the assistant generates multiple alternative hypotheses with supporting and contradicting observations:
- Hypothesis 1: Operational Coordination (e.g. 42%)
- Hypothesis 2: Coincidental Proximity (e.g. 31%)
- Hypothesis 3: Intermediary Facet (e.g. 19%)

Also suggests statutory references under the **Bharatiya Nyaya Sanhita (BNS)** (e.g. Section 303, Section 318, Section 61) and PMLA strictly as draft aids for public prosecutor review.

The assistant maintains **rolling conversation memory**: the last 8 exchanges are re-sanitized server-side (prior assistant text is also treated as untrusted) and included with each query, enabling follow-up questions.

### 7.6 Temporal Analysis Engine
[`timeline.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/temporal/timeline.ts) derives the investigation chronology from real case records — never hardcoded content:
- **Event sources**: the case incident anchor; one event per relationship (timestamp resolution: `validFrom` → provenance timestamp → record-entry `createdAt`); ingested document receipts; and committed AI extraction events.
- **Categorization by predicate**: `CALLED`/`COMMUNICATED_WITH` → communication, `TRANSFERRED_FUNDS` → financial, forensic provenance → forensic, `SUSPECTED_IN`/`PARTICIPATED_IN` → incident, documents → document, movement/ownership → surveillance.
- **Temporal scrubber** (`networkStateAtTime`): computes the graph state as of any timestamp — an edge is active once its evidential timestamp has occurred; a node once it participates in any active edge; reports the dominant hub by degree and the density signal.
- **Before/after statistics** (`beforeAfterStats`): 90-day pre/post-incident phase windows with link counts, key hubs, and dominant activity categories computed from the filtered graph.

### 7.7 Case Prioritization Engine
[`prioritization.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/cases/prioritization.ts) ranks the case portfolio with a transparent, configurable weighted score:
$$S = w_{risk}\,\rho_{priority} + w_{density}\,\min(1, |V|/40) + w_{anomaly}\,\min(1, |A|/10) + w_{urgency}\,2^{-\Delta days/30}$$
with defaults $w = (0.40, 0.20, 0.25, 0.15)$, priority weights $\rho \in \{0.2, 0.4, 0.7, 1.0\}$ for low→critical, anomaly load $|A|$ from §6 detectors, and urgency decaying to zero past 180 days. Every factor is surfaced in a human-readable breakdown for supervisory audit.

### 7.8 Tip Credibility Triage
[`credibility.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/intel/credibility.ts) scores public tips on a 0.30 baseline with additive factors: substantive length, verifiable specifics (plate, phone, time, coordinates via regex), named locations, semi-identified source categories, and **corroboration against existing case entities** (label/alias substring, plate, and normalized phone-digit matching) — capped at 0.95 and always displayed as an inspectable factor list. It is a triage aid, never a verdict.

---

## 8. Neo4j Graph Storage Engine & Local Resilience Layer

The knowledge graph is persisted as a **native Neo4j property graph** — the system of record for
all case data. The browser never talks Bolt: every read and write flows through the
`/api/graph/*` Next.js route handlers ([`neo4j.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/neo4j.ts)),
which hold the driver singleton (`neo4j-driver` v6, `disableLosslessIntegers`, connection pool of 5
for serverless compatibility) and provision the schema idempotently on first use. Unconfigured
credentials or an unreachable database surface as explicit HTTP 503 errors — zero-fallback applies
to storage exactly as it does to AI.

### 8.1 Property Graph Model & Constraints

| Graph Element | Model | Key Properties |
|---|---|---|
| `(:Case)` | Case dossier node | `id`, `title`, `caseNumber`, `priority`, `incidentDate`, `tags`, … |
| `(:Entity)` | Every board card / graph node | `id`, `caseId`, `type`, `label`, `aliases[]`, `attributesJson`, `confidence`, `status`, `visualType`, `boardX/Y/Rotation`, `provenanceJson` |
| `(:Document)` | Ingested source record | `id`, `caseId`, `title`, `documentType`, `rawText`, extraction counts |
| `(:TimelineEvent)` | Chronology event node | `id`, `caseId`, `timestamp`, `category`, `involvedEntityIds[]`, `source` |
| `[:HAS_ENTITY]`, `[:HAS_DOCUMENT]`, `[:HAS_EVENT]` | Case → record ownership | — |
| `[:CALLED]`, `[:TRANSFERRED_FUNDS]`, `[:OWNS]`, … | **Investigative predicates as native relationship types** | `id`, `caseId`, `predicate`, `weight`, `confidence`, `status`, `threadColor`, `validFrom/To`, `provenanceJson` |

Because predicates are real relationship types, the evidential network is directly queryable in
Cypher — e.g. the entire money-layering chain is one traversal:
`MATCH (a:Entity)-[:TRANSFERRED_FUNDS*2]->(c:Entity) RETURN a, c`.

**Automatically provisioned schema** (idempotent `IF NOT EXISTS`): uniqueness constraints on
`Case.id`, `Entity.id`, `Document.id`, `TimelineEvent.id`; lookup indexes on `Entity.caseId`,
`Document.caseId`, `TimelineEvent.caseId`.

**Property mapping** ([`syncTransform.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/graph/syncTransform.ts)):
Neo4j properties must be primitives, so nested `attributes`/`provenance` maps are JSON-encoded and
`boardPosition` is flattened to `boardX/boardY/boardRotation`; relationship types are produced by a
whitelist sanitizer (`predicateToRelType`) — never string interpolation of raw input — because
Cypher cannot parameterize types.

### 8.2 Graph API Gateway

| Route | Verbs | Purpose |
|---|---|---|
| `/api/graph/status` | GET | Connectivity + case/entity/edge counts (drives the status bar) |
| `/api/graph/cases` | GET/POST/PATCH/DELETE | Portfolio list (with per-case counts + anomaly load), create, update, purge |
| `/api/graph/case` | GET | Full authoritative case state (case, entities, rels, docs, events) |
| `/api/graph/entities` | POST/PATCH/DELETE | Entity CRUD; DELETE cascades via `DETACH DELETE` |
| `/api/graph/relationships` | POST/PATCH/DELETE | Edge CRUD; predicate changes recreate the typed edge |
| `/api/graph/merge` | POST | Identity merge in one transaction (edges recreated against the kept entity, provenance intact) |
| `/api/graph/commit-extraction` | POST | Human-approved AI extraction: server-side fuzzy duplicate resolution, collision-free placement, document + timeline persistence |
| `/api/graph/timeline-events` | POST | Timeline event upsert |
| `/api/graph/import` | POST | Validated `.crimelens.json` bundle import into the graph |
| `/api/graph/seed` | POST | Demo case bootstrap (`force: true` re-seeds for the reset action) |

### 8.3 Reactive Store & Write-Through Cache
Managed via the unified hook [`useInvestigationStore.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/store/useInvestigationStore.ts):
- Mutations call the Graph API first; the returned authoritative records update React state, then
  mirror into the IndexedDB cache (`replaceCaseScope`) for resilient boot.
- If Neo4j is unreachable at boot, the UI hydrates from the cache in read-only mode with an
  explicit banner — mutations are refused rather than silently diverging (zero-fallback).
- Card position updates skip audit noise; case switching reloads scoped state without a page
  reload; the active case ID persists in localStorage.
- **Undo/Redo** (⌘Z / ⌘⇧Z): 40-deep snapshot stack reconciled against Neo4j by ID diff (deletes
  removed records, re-upserts restored ones with their original identities).

### 8.4 Local Resilience Stores (IndexedDB `crimelens_investigation_db`)

| Object Store | Role |
|---|---|
| `cases`, `entities`, `relationships`, `documents`, `timeline_events` | Write-through mirror of the Neo4j state (offline boot view) |
| `audit_logs` | Append-only chain of custody — deliberately never rewritten by cache sync |
| `intel_submissions` | Public tips + credibility triage (user-scoped) |
| `safety_contacts` | Women safety trusted circle (user-scoped) |

### 8.5 Immutable Audit Trail & Chain of Custody
Every investigator operation writes an immutable log record with timestamp, investigator ID, target ID, and change summary. Covered actions: `case_created`, `case_updated`, `case_deleted`, `entity_created`, `entity_updated`, `entity_deleted`, `entities_merged`, `relationship_created`, `relationship_confirmed`, `relationship_deleted`, `document_ingested`, `ai_extraction_approved`, `report_generated`, `link_prediction_confirmed`, `bundle_exported`, `bundle_imported`, `intel_triaged`, `intel_promoted`, and `sos_dispatched`.

### 8.6 Case Bundle Export / Import
- **Export** produces a `.crimelens.json` bundle (schema v1.1.0) containing the case record, entities, relationships, documents, audit logs, timeline events, and case-scoped intel submissions.
- **Import** ([`importExport.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/storage/importExport.ts)) validates structure (system marker, case record, referential integrity of every relationship against the entity set — dangling references abort with an actionable `BundleValidationError`), then **re-scopes every record to a fresh `<id>_imported_<ts>` identity** when the bundle's case ID already exists in the graph, so live investigations are never overwritten. Imports write through the same Graph API upserts, switch to the restored case, and are audited.

---

## 9. Automated Verification & Scalability Benchmarks

### 9.1 Test Pyramid
Executed via Vitest (`pnpm test`):
```text
 ✓ tests/unit/identityMatcher.test.ts (4 tests)
 ✓ tests/unit/anomalyDetectors.test.ts (5 tests)
 ✓ tests/unit/graphAlgorithms.test.ts (5 tests)
 ✓ tests/unit/sanitize.test.ts (3 tests)
 ✓ tests/unit/casePrioritization.test.ts (7 tests)
 ✓ tests/unit/timelineDerivation.test.ts (5 tests)
 ✓ tests/unit/tipCredibility.test.ts (4 tests)
 ✓ tests/unit/importBundle.test.ts (5 tests)
 ✓ tests/unit/graphSyncTransform.test.ts (6 tests)
 ✓ tests/stress/graphScalability.test.ts (3 tests)

 Test Files  10 passed (10)
      Tests  46 passed (46)
```

### 9.2 Graph Scalability Stress Benchmarks (up to 5,000 nodes)
Performance metrics recorded in [`graphScalability.test.ts`](file:///Users/abhinav/Projects/CrimeLens/tests/stress/graphScalability.test.ts):

| Graph Size | Operations Evaluated | Benchmark Target | Measured Execution |
|---|---|---|---|
| **100 Nodes** | Shortest path + Degree + Louvain community | < 200ms | **~18ms** |
| **1,000 Nodes** | Shortest path + Degree + Louvain (5 iter) | < 1000ms | **~145ms** |
| **5,000 Nodes** | Small-world graph pathfinding + Degree | < 2500ms | **~380ms** |

---

## 10. Production Deployment & Security Guarantees

1. **Zero Secret Leakage**: The Groq API key (`GROQ_API_KEY`) and the Neo4j credentials (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`) reside exclusively in serverless environment variables. Git repositories and client bundles contain zero plaintext secrets; the browser reaches the graph only through the `/api/graph/*` server routes.
2. **Graph Database Provisioning**: any Neo4j 5+ / 2025.x instance works — local (Homebrew, Docker, Desktop) or hosted (AuraDB, `neo4j+s://` URIs). Schema constraints and indexes are provisioned automatically on first connection; the demo case seeds itself when the database is empty.
3. **Deterministic Vercel Build**: Pre-configured with Next.js Turbopack, strict type checking, and automatic edge routing. The Neo4j driver connection pool is sized for serverless (5 connections per instance).
4. **Live Production Endpoints**:
   - **Production URL**: [https://crimelens-eight.vercel.app](https://crimelens-eight.vercel.app)
   - **GitHub Repository**: [https://github.com/Abhinav-Prabhakar/CrimeLens](https://github.com/Abhinav-Prabhakar/CrimeLens)
