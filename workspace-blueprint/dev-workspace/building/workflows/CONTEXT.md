# Build Pipeline

## What This Is

Four stages. Each stage's output becomes the next stage's input. An agent enters one stage, does its work, and outputs forward.

```
01-briefs/  →  02-specs/  →  03-builds/  →  04-output/
 (what)          (plan)        (work)          (done)
```

---

## Agent Routing

| Your Task | Input | Also Load | Output | Skills at This Stage |
|-----------|-------|-----------|--------|---------------------|
| Brief → Spec | Brief from `01-briefs/` | `../docs/tech-standards.md` | Spec in `02-specs/` | Web Search MCP (research best practices) |
| Spec → Build | Spec from `02-specs/` | `../docs/tech-standards.md` | Working build in `03-builds/` and/or `../src/` | `/frontend-design` (web UI), `/webapp-testing` (verify) |
| Build → Output | Completed build | Original spec (as acceptance criteria) | Deliverable in `04-output/` | `/webapp-testing` (final verification) |

---

## Stage Details

### 01-briefs/ — The Input

Finalized specs or PRDs from `writing/final/`, copied here. A brief says what to build and why. It is NOT a technical spec — it's the problem statement and requirements in plain language.

**Comes from:** `../../writing/final/[slug]-final.md` → copy here as `[slug].md`
**File pattern:** `[slug].md`

---

### 02-specs/ — The Plan

Turns the brief into a buildable technical contract. The spec defines WHAT and the acceptance criteria — not HOW to implement it. The builder decides the how.

**What a spec includes:**
- Scope and acceptance criteria (pass/fail testable)
- Technical approach at a high level
- Dependencies and prerequisites
- Definition of done

**What a spec does NOT include:**
- Exact implementation code
- Pixel-perfect layouts
- Every edge case (handle obvious ones, flag the rest)

**File pattern:** `[slug]-spec.md`

---

### 03-builds/ — The Work

Where code gets written. The builder reads the spec and tech-standards, then has full creative freedom for implementation.

**File pattern:** `[slug]/` (folder — builds often have multiple files)

**Skills active here:**
- `/frontend-design` — for web-based deliverables. Brings design intelligence: layouts, color, typography, responsive patterns.
- `/webapp-testing` — test what you build. Playwright-based browser automation to verify the thing actually works.
- Web Search MCP — if you need to look up current library docs mid-build.

---

### 04-output/ — The Deliverable

Finished, verified work. Nothing lands here without passing the spec's acceptance criteria.

**File pattern:** `[slug]-v[n].[ext]`

Version number increments with each revision. `v1` = first complete output. `v2` = after first round of feedback.

---

## Pipeline Rules

1. **Flow is forward.** `01 → 02 → 03 → 04`. No skipping.
2. **Each agent loads only what it needs.** See the routing table above.
3. **Changes propagate forward.** Changed brief → regenerate spec. Changed spec → rebuild.
4. **The builder has creative freedom within standards.** The spec defines the contract. Tech-standards define the floor. Everything else is the builder's call.
5. **Nothing ships untested.** Run `/webapp-testing` or manual verification before `04-output/`.

---

## Skill Map

```
01-briefs/       02-specs/           03-builds/          04-output/
                 ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
                 │ Web Search  │     │ /frontend-  │     │ /webapp-     │
                 │   MCP       │     │   design    │     │   testing    │
                 └─────────────┘     │             │     │  (final QA)  │
                                     │ /webapp-    │     └──────────────┘
                                     │   testing   │
                                     │             │
                                     │ Web Search  │
                                     │   MCP       │
                                     └─────────────┘
```
