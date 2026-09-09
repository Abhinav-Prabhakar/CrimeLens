# 🕵️‍♂️ CrimeLens — AI-Powered Criminal Network Analysis System

[![Production Build](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.185-white?logo=three.js)](https://threejs.org/)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq%20LLaMA%203.3%2070B-orange?logo=fastapi)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Vitest-18%20Passed-emerald?logo=vitest)](https://vitest.dev/)
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
- **Verlet Thread Physics Simulation**: Multi-colored cords (Crimson, Twine, Cobalt, Shadow) drape realistically under simulated gravity between evidence pins.
- **Procedural Evidence Textures**: High-resolution procedural textures for suspect mugshot cards, crime scene polaroids, classified dossiers with red stamps, folded yellow sticky notes, latent fingerprint cards, and forensic evidence bags.
- **Tactile Camera Rig**: Smooth panning, zoom, orbit tilt damping, and lasso multi-selection.

### 2. Analytical 2D Knowledge Graph
High-performance analytical network diagram:
- **Shortest Path Querying**: Computes the most probable link path between any two suspects, displaying intermediate brokers and supporting evidence.
- **Centrality Heatmaps**: Dynamically sizes nodes by Degree Centrality and identifies critical intermediaries via Betweenness Centrality.
- **Louvain Community Detection**: Partitions the network into syndicate cells, gangs, and operational clusters.
- **Topological Link Prediction**: Surfaces covert, unrecorded associations between persons of interest using Jaccard Similarity, Adamic-Adar, and Resource Allocation indices.

### 3. Chronological Timeline & Before/After Comparison
- Interactive temporal scrubber tracking network evolution across key events.
- **Pre-Incident vs Post-Incident Comparison Mode**: Compares the covert preparation network against the post-breach transit and liquidation network.
- Category filtering: crime incidents, communications, financial transfers, and forensic recoveries.

### 4. AI Document Ingestion & Staging Area
- Ingests unstructured FIRs, interrogation transcripts, CDR dumps, and financial transaction sheets.
- Server-side parsing via **Groq Cloud** in strict JSON schema mode.
- **Prompt Injection Hardening**: Sanitizes and defangs adversarial jailbreak instructions hidden inside seized documents.
- **Human-in-the-Loop Review**: Extracted entities and relationships are staged in an interactive review modal where investigators verify, edit confidence, or reject false leads before graph commit.

### 5. Entity Resolution & Identity Disambiguation
- Discovers duplicate suspects recorded under slight spelling variations or aliases (e.g., *"Rahul Sharma"* vs *"Rahul K. Sharma"*).
- Multi-signal similarity scoring: Levenshtein string distance, token abbreviations, shared phone numbers, vehicle registrations, and address matching.
- Highlights conflicting attributes (e.g. incompatible reported ages) and enables one-click merging or alias linking.

### 6. Suspicious Pattern & Anomaly Detection
Rule and graph heuristics detecting:
- **Rapid Financial Layering**: Structured hopping (Entity A → B → C) through intermediary accounts.
- **Communication Bursts**: Sudden surges in call frequency immediately preceding an incident.
- **Geographic Anomalies**: Suspect presence geolocated in the immediate incident sector during the breach window.
- **Offshore Shell Structures**: Nominee corporate vehicles with overseas registrations.

### 7. AI Investigator Assistant & Multi-Hypothesis Generator
- Context-aware intelligence assistant grounded strictly in current case evidence.
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
- Create, manage, and switch between multi-case dossiers.
- Configurable prioritization ranking based on public risk severity, urgency, solvability, and network entity density.

### 10. Forensic Image & Object Analysis
- Visual evidence classification and vehicle license plate recognition with confidence intervals and uncertainty statements.

### 11. Audit Trail & Chain of Custody
- Immutable audit log recording every investigator action (case creation, entity edits, relationship confirmation, AI approvals).

### 12. Offline-First IndexedDB Storage
- All cases, dossiers, nodes, relationships, and audit logs persist locally in **IndexedDB** (`crimelens_investigation_db`).
- Complete case backup and cross-team sharing via `.crimelens.json` export and import.
- Operates seamlessly in air-gapped or low-connectivity tactical environments.

### 13. Women Safety & Emergency Escalation
- Trusted well-wisher circle registration.
- One-touch emergency SOS simulation dispatching geolocated alerts to trusted contacts and the 1091 helpline.

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

### Verified Test Results:
- `tests/unit/graphAlgorithms.test.ts` (5 tests): Shortest path, degree, betweenness centrality, Louvain communities, and link prediction.
- `tests/unit/identityMatcher.test.ts` (4 tests): Levenshtein distance, abbreviations, phone/plate matching, and conflict flagging.
- `tests/unit/anomalyDetectors.test.ts` (3 tests): Rapid financial hopping, communication burst, and geographic anomaly checks.
- `tests/unit/sanitize.test.ts` (3 tests): Prompt injection neutralization and fallback-free schema parsing.
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
| **3D Engine** | Three.js r185, GSAP 3.15, Custom Verlet Rope Physics |
| **AI / LLM** | Groq Cloud SDK (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) |
| **Offline DB** | IndexedDB via `idb` v8 + LocalStorage |
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
