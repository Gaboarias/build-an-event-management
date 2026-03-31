# Software Dev Workspace — Map

## What This Is

A 3-workspace system for software development. Writing, building, and distributing — each siloed. An agent reads the workspace CONTEXT.md, does its work, and exits.

**CONTEXT.md** routes you to the right workspace. This file is the permanent map.

---

## Folder Structure

```
dev-workspace/
├── CLAUDE.md                           ← You are here (always loaded)
├── CONTEXT.md                          ← Task router
│
├── writing/                            ← Specs, docs, READMEs, blog posts
│   ├── CONTEXT.md
│   ├── docs/
│   │   ├── voice.md                    ← Tone and communication style
│   │   └── style-guide.md              ← Formatting, structure, length rules
│   ├── drafts/                         ← Work in progress
│   └── final/                          ← Ready to publish or hand off
│
├── building/                           ← Features, bug fixes, code
│   ├── CONTEXT.md
│   ├── docs/
│   │   └── tech-standards.md           ← Code quality, testing, architecture rules
│   ├── workflows/                      ← 4-stage build pipeline
│   │   ├── CONTEXT.md                  ← Pipeline routing
│   │   ├── 01-briefs/                  ← What to build (input)
│   │   ├── 02-specs/                   ← Technical plan (contract)
│   │   ├── 03-builds/                  ← Active work
│   │   └── 04-output/                  ← Finished, verified deliverables
│   └── src/                            ← Source code
│
└── distributing/                       ← Releases, deployments, announcements
    ├── CONTEXT.md
    ├── docs/
    │   └── channels.md                 ← Where and how things ship
    └── content/
        ├── release-notes/
        ├── announcements/
        └── changelogs/
```

---

## Quick Navigation

| Want to... | Go here |
|------------|---------|
| **Write a spec or PRD** | `writing/CONTEXT.md` |
| **Write a README or doc** | `writing/CONTEXT.md` |
| **Write a blog post or changelog** | `writing/CONTEXT.md` |
| **Build a feature** | `building/CONTEXT.md` |
| **Fix a bug** | `building/CONTEXT.md` |
| **Go through the build pipeline** | `building/workflows/CONTEXT.md` |
| **Release software** | `distributing/CONTEXT.md` |
| **Write release notes** | `distributing/CONTEXT.md` |
| **Deploy to production** | `distributing/CONTEXT.md` |
| **Write a launch announcement** | `distributing/CONTEXT.md` |

---

## Cross-Workspace Flow

```
writing/ (specs, docs, posts → polished output)
    ↓ final specs copy to building/workflows/01-briefs/
building/ (brief → spec → code → verified output)
    ↓ releases + output feed distributing/
distributing/ (release notes, deploys, announcements)
```

Flow is one-way. `distributing/` never feeds back.

---

## ID & Naming Conventions

| Content Type | Pattern | Example |
|-------------|---------|---------|
| Specs / PRDs / docs | `[slug]-[status].md` | `auth-feature-draft.md` |
| Build briefs | `[slug].md` | `user-auth.md` |
| Build specs | `[slug]-spec.md` | `user-auth-spec.md` |
| Active builds | `[slug]/` (folder) | `user-auth/` |
| Build deliverables | `[slug]-v[n].[ext]` | `user-auth-v1.zip` |
| Release notes | `[YYYY-MM-DD]-[slug].md` | `2026-03-16-v2-release.md` |
| Announcements | `[platform]-[slug].md` | `twitter-v2-launch.md` |

**Statuses:** `draft` → `review` → `final`

---

## File Placement Rules

### Writing
- Drafts: `writing/drafts/[slug]-[status].md`
- Final: `writing/final/[slug]-final.md`
- Ready to build: copy to `building/workflows/01-briefs/[slug].md`

### Building
- Briefs: `building/workflows/01-briefs/[slug].md`
- Specs: `building/workflows/02-specs/[slug]-spec.md`
- Active builds: `building/workflows/03-builds/[slug]/`
- Output: `building/workflows/04-output/[slug]-v[n].[ext]`

### Distributing
- Release notes: `distributing/content/release-notes/[YYYY-MM-DD]-[slug].md`
- Announcements: `distributing/content/announcements/[platform]-[slug].md`
- Changelogs: `distributing/content/changelogs/[slug].md`

---

## Token Management

Each workspace is siloed. Load only what the task needs.

- Writing a spec? → Load `writing/docs/voice.md` + `style-guide.md`. Skip building entirely.
- Building a feature? → Load `building/docs/tech-standards.md` + the spec. Skip writing docs.
- Releasing? → Load `distributing/docs/channels.md`. Pull from writing only for voice reference.

The CONTEXT.md files in each workspace tell you exactly what to load.

---

## Skills & Tools Available

| Tool | Type | Used In |
|------|------|---------|
| `/humanizer` | Skill | writing/ (before final), distributing/ (all announcements) |
| `/pdf` | Skill | distributing/ (downloadable guides, docs) |
| `/pptx` | Skill | distributing/ (presentations, pitch decks) |
| `/frontend-design` | Skill | building/ (Stage 03 — UI/web work) |
| `/webapp-testing` | Skill | building/ (Stage 03-04 — verify builds) |
| Web Search | MCP | writing/ (research), building/ (spec stage) |
