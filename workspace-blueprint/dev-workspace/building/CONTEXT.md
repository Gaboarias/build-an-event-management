# Building

## What This Workspace Is

Where code gets written. Briefs from writing/ become specs, specs become working software, and working software becomes verified deliverables. This workspace is downstream from writing/ and upstream from distributing/.

---

## Where to Go

| You Want To... | Go Here |
|----------------|---------|
| **Understand the build pipeline** | `workflows/CONTEXT.md` |
| **Look up code quality standards** | `docs/tech-standards.md` |
| **Start a new build from a brief** | `workflows/CONTEXT.md` → Stage 01 |

Don't read everything. Identify your task, load only what you need.

---

## Folder Structure

```
building/
├── CONTEXT.md                  ← You are here
├── docs/
│   └── tech-standards.md       ← Code quality, testing, architecture rules
├── workflows/                  ← The 4-stage pipeline
│   ├── CONTEXT.md              ← Pipeline routing (read this for all build work)
│   ├── 01-briefs/              ← What to build (input from writing/)
│   ├── 02-specs/               ← Technical plan (contract for the build)
│   ├── 03-builds/              ← Active work
│   └── 04-output/              ← Finished, verified deliverables
└── src/                        ← Source code
```

---

## What to Load

| Task | Load These | Skip These |
|------|-----------|------------|
| Brief → Spec | Brief from `01-briefs/`, `docs/tech-standards.md` | writing/ docs |
| Spec → Build | Spec from `02-specs/`, `docs/tech-standards.md` | writing/ docs |
| Review a build | The spec (as acceptance criteria), the build output | `docs/tech-standards.md` unless checking specific standards |

---

## Skills & Tools

| Skill / Tool | Stage | Purpose |
|-------------|-------|---------|
| Web Search MCP | 02-specs | Research current best practices, check library recommendations |
| `/frontend-design` | 03-builds | When building web UIs — layouts, color, typography, responsive patterns |
| `/webapp-testing` | 03-builds + 04-output | Playwright-based browser testing to verify web deliverables work |

---

## Hard Rules

1. **Don't build without a spec.** Even small tasks get a lightweight spec. It prevents scope creep and gives reviewers something to check against.
2. **Specs are contracts, not blueprints.** A spec says WHAT to build and the acceptance criteria. Implementation details are the builder's call.
3. **Nothing ships untested.** Use `/webapp-testing` or manual verification before moving anything to `04-output/`.
4. **Don't load writing/ docs here.** Voice and style guidelines don't apply to code.
