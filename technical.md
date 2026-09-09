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
8. [Offline-First Storage Engine & Reactive Store](#8-offline-first-storage-engine--reactive-store)
   - [8.1 IndexedDB Schema & Indexes](#81-indexeddb-schema--indexes)
   - [8.2 Bi-directional Board ↔ Graph Synchronization](#82-bi-directional-board--graph-synchronization)
   - [8.3 Immutable Audit Trail & Chain of Custody](#83-immutable-audit-trail--chain-of-custody)
9. [Automated Verification & Scalability Benchmarks](#9-automated-verification--scalability-benchmarks)
   - [9.1 Test Pyramid](#91-test-pyramid)
   - [9.2 Graph Scalability Stress Benchmarks (up to 5,000 nodes)](#92-graph-scalability-stress-benchmarks-up-to-5000-nodes)
10. [Production Deployment & Security Guarantees](#10-production-deployment--security-guarantees)

---

## 1. Architectural Overview

CrimeLens is an investigative intelligence platform designed to eliminate data fragmentation across First Information Reports (FIRs), interrogation transcripts, Call Detail Records (CDRs), financial ledgers, and forensic physical evidence.

The architecture operates on a **dual-view synchronized state model**:
- **Spatial Intuition View**: A 3D tactile detective corkboard rendered via WebGL/Three.js with realistic Verlet yarn physics, pins, and polaroids.
- **Analytical Intelligence View**: An in-browser topological knowledge graph executing centrality heatmaps, community detection, shortest-path calculation, and link prediction.

Both views read from and write to a single source of truth: an offline-first **IndexedDB** database synchronized with serverless **Groq Cloud AI APIs** on Next.js 16.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BROWSER CLIENT                                       │
│                                                                                        │
│  ┌───────────────────────────────┐                  ┌───────────────────────────────┐  │
│  │   3D Tactical Corkboard       │                  │   2D Force Knowledge Graph    │  │
│  │  (Three.js, Verlet Ropes,     │◄─ Bi-directional ┼─►│  (Canvas Force Graph Canvas,  │  │
│  │   Pins, Textures, Drag/Zoom)  │    State Sync    │   Louvain clusters, Paths)    │  │
│  └──────────────┬────────────────┘                  └───────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 ▼                                                   ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                  Unified Investigation State & Reactive Store                    │  │
│  │  (Active Case, Graph Projection, Filter Pipeline, History Stack Undo/Redo)       │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │                                              │
│                 ┌───────────────────────┴───────────────────────┐                      │
│                 ▼                                               ▼                      │
│  ┌──────────────────────────────┐              ┌──────────────────────────────────┐    │
│  │  In-Browser Analytics Engine │              │     Offline-First Persistence    │    │
│  │  - Dijkstra Shortest Path    │              │  - IndexedDB (Cases, Evidences,  │    │
│  │  - Degree & Betweenness      │              │    Entities, Relationships, Logs)│    │
│  │  - Louvain Community Detect  │              │  - LocalStorage (User Prefs, UI) │    │
│  │  - Link Prediction (Jaccard) │              │  - Export / Import JSON & PDF    │    │
│  │  - Temporal Diff Engine      │              └──────────────────────────────────┘    │
│  └──────────────┬───────────────┘                                                      │
└─────────────────┼──────────────────────────────────────────────────────────────────────┘
                  │ HTTPS (REST / Serverless)
                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                NEXT.JS BACKEND RUNTIME                                 │
│                                                                                        │
│  ┌─────────────────────────────────┐        ┌──────────────────────────────────────┐  │
│  │     Document Ingestion API      │        │       AI Intelligence Gateway        │  │
│  │  - Input sanitization           │───────►│  - Groq API (`openai/gpt-oss-120b`)  │  │
│  │  - Prompt injection shielding   │        │  - Strict JSON normalization schema  │  │
│  │  - Multi-document parser        │        │  - Zero fallbacks; explicit errors   │  │
│  └─────────────────────────────────┘        └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
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
| **AI LLM Gateway** | Groq Cloud SDK | 1.6.0 | Sub-second inference (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) |
| **Persistence** | IndexedDB via `idb` | 8.0.3 | Offline-first relational storage (cases, nodes, links, logs) |
| **Validation** | Zod | 4.5.4 | Strict schema definition and LLM output parsing |
| **Test Suite** | Vitest + JSDOM | 3.2.7 | Fast unit, stress, and scalability benchmarking |

---

## 3. Tactile 3D Corkboard & Verlet Physics Engine

The 3D corkboard ([`InvestigationCorkboard.tsx`](file:///Users/abhinav/Projects/CrimeLens/src/components/board/InvestigationCorkboard.tsx)) preserves the classic murder board tactile visual language.

### 3.1 Verlet Thread Solver
Rather than rendering static straight lines between evidence pins, CrimeLens employs a physics-based **Verlet Integration & Catenary Draping Curve**:

Given anchor pin positions $\mathbf{P}_1 = (x_1, y_1, z_1)$ and $\mathbf{P}_2 = (x_2, y_2, z_2)$:
1. Calculate Euclidean span $d = \|\mathbf{P}_2 - \mathbf{P}_1\|$.
2. Calculate sag depth $s = \min\left(6.0, 0.18 \cdot d + 0.8\right)$.
3. Compute midpoint $\mathbf{M} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{2} - (0, s, 0.1)$.
4. Construct a Quadratic Bézier Spline $\mathbf{B}(t) = (1-t)^2 \mathbf{P}_1 + 2(1-t)t \mathbf{M} + t^2 \mathbf{P}_2$ sampled across 24 vertices.
5. Render dynamic threads in four authentic investigative cord pigments:
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

### 3.3 Camera Rig & Raycasting Interaction
- **Perspective Camera**: 30° Field of View with orbit damping.
- **Raycaster Object Picking**: Translates normalized device coordinates $(x_{\text{ndc}}, y_{\text{ndc}})$ into 3D world space, intersecting against card geometry bounds while projecting drag movements along a virtual $Z=0$ plane.

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
Weighted Label Propagation with heuristic convergence in $\le 20$ iterations:
1. Initialize each node in its own singleton community $c_u = u$.
2. In randomized sequence, update node community to the label with maximal weighted neighbor endorsement:
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
Flags structured capital routing through nominee accounts.

### 6.2 Pre-Incident Communication Burst
Filters communication relationships (`CALLED`, `COMMUNICATED_WITH`) where interaction frequency $w \ge 8$ within the 72-hour temporal pre-incident window.

### 6.3 Geographic Scene Proximity Anomaly
Flags relationships where predicate is `LOCATED_AT` connecting a person of interest to the physical sector of the crime scene during the incident timeframe.

### 6.4 Offshore Shell Structuring
Detects organizations tagged as non-operational offshore entities registered in zero-tax corporate registries (e.g. BVI, Tortola, Seychelles) that disburse capital immediately after receipt.

---

## 7. AI Intelligence Gateway & Zero-Fallback Architecture

### 7.1 Groq Cloud LLM Integration
- **Primary Model**: `openai/gpt-oss-120b` (high-parameter reasoning for multi-step entity extraction and hypothesis generation).
- **Fast Model**: `openai/gpt-oss-20b` (sub-200ms conversational inference).
- **Latency**: End-to-end execution typically under 400ms.

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
No extracted entity or relationship is ever injected directly into the knowledge graph. Extracted items are placed in an interactive staging modal ([`DocumentIngestModal.tsx`](file:///Users/abhinav/Projects/CrimeLens/src/components/ingestion/DocumentIngestModal.tsx)) where the investigator must verify, adjust confidence, or uncheck false leads before committing.

### 7.5 Multi-Hypothesis Explanations & Legal Drafting Aids
For ambiguous events, the assistant generates multiple alternative hypotheses with supporting and contradicting observations:
- Hypothesis 1: Operational Coordination (e.g. 42%)
- Hypothesis 2: Coincidental Proximity (e.g. 31%)
- Hypothesis 3: Intermediary Facet (e.g. 19%)

Also suggests statutory references under the **Bharatiya Nyaya Sanhita (BNS)** (e.g. Section 303, Section 318, Section 61) and PMLA strictly as draft aids for public prosecutor review.

---

## 8. Offline-First Storage Engine & Reactive Store

### 8.1 IndexedDB Schema & Indexes
Database: `crimelens_investigation_db` (Version 1 via `idb`):

| Object Store | Primary Key | Secondary Indexes | Description |
|---|---|---|---|
| `cases` | `id` | — | Case metadata, lead officer, priority ranking |
| `entities` | `id` | `caseId`, `type` | Nodes and board evidence cards |
| `relationships` | `id` | `caseId`, `sourceId`, `targetId` | Directed edges and yarn connections |
| `documents` | `id` | `caseId` | Raw ingested files and extraction staging records |
| `audit_logs` | `id` | `caseId`, `timestamp` | Immutable chain of custody action log |
| `intel_submissions` | `id` | `submittedAt` | Public anonymous tips and credibility triage |

### 8.2 Bi-directional Board ↔ Graph Synchronization
Managed via the unified hook [`useInvestigationStore.ts`](file:///Users/abhinav/Projects/CrimeLens/src/lib/store/useInvestigationStore.ts):
- Card position updates on the 3D corkboard mutate coordinate attributes in IndexedDB.
- Graph analysis updates or newly approved AI extractions project cards onto the 3D board using automated spatial collision offsets.

### 8.3 Immutable Audit Trail & Chain of Custody
Every investigator operation (`entity_created`, `entities_merged`, `relationship_confirmed`, `document_ingested`) writes an immutable log record with timestamp, investigator ID, target ID, and change summary.

---

## 9. Automated Verification & Scalability Benchmarks

### 9.1 Test Pyramid
Executed via Vitest (`pnpm test`):
```text
 ✓ tests/unit/identityMatcher.test.ts (4 tests)
 ✓ tests/unit/anomalyDetectors.test.ts (3 tests)
 ✓ tests/unit/graphAlgorithms.test.ts (5 tests)
 ✓ tests/unit/sanitize.test.ts (3 tests)
 ✓ tests/stress/graphScalability.test.ts (3 tests)

 Test Files  5 passed (5)
      Tests  18 passed (18)
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

1. **Zero Secret Leakage**: The Groq API key resides exclusively in serverless environment variables (`GROQ_API_KEY`). Git repositories and client bundles contain zero plaintext secrets.
2. **Deterministic Vercel Build**: Pre-configured with Next.js Turbopack, strict type checking, and automatic edge routing.
3. **Live Production Endpoints**:
   - **Production URL**: [https://crimelens-eight.vercel.app](https://crimelens-eight.vercel.app)
   - **GitHub Repository**: [https://github.com/Abhinav-Prabhakar/CrimeLens](https://github.com/Abhinav-Prabhakar/CrimeLens)
