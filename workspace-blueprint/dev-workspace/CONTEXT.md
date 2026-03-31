# Software Dev Workspace — Task Router

## What This Is

Three siloed workspaces covering the full software development lifecycle: write, build, distribute. **CLAUDE.md** (always loaded) has the folder map and naming rules. This file routes you to work.

---

## Task Routing

| Your Task | Go Here | You'll Also Need |
|-----------|---------|-----------------|
| **Write a spec or PRD** | `writing/CONTEXT.md` | `writing/docs/voice.md` + `style-guide.md` |
| **Write a README or technical doc** | `writing/CONTEXT.md` | `writing/docs/voice.md` + `style-guide.md` |
| **Write a blog post** | `writing/CONTEXT.md` | `writing/docs/voice.md` + `style-guide.md` |
| **Edit or review a draft** | `writing/CONTEXT.md` | `writing/docs/voice.md` + the draft |
| **Build a feature** | `building/CONTEXT.md` | `building/docs/tech-standards.md` |
| **Fix a bug** | `building/CONTEXT.md` | `building/docs/tech-standards.md` |
| **Run the build pipeline** | `building/workflows/CONTEXT.md` | Brief from `01-briefs/` |
| **Release software** | `distributing/CONTEXT.md` | `distributing/docs/channels.md` |
| **Write release notes or a changelog** | `distributing/CONTEXT.md` | `distributing/docs/channels.md` |
| **Write a launch announcement** | `distributing/CONTEXT.md` | `writing/docs/voice.md` for tone |
| **Deploy to production** | `distributing/CONTEXT.md` | `distributing/docs/channels.md` |

---

## Workspace Summary

| Workspace | Purpose | Skills & Tools |
|-----------|---------|---------------|
| `writing/` | Ideas → polished specs, docs, and posts | `/humanizer`, Web Search MCP |
| `building/` | Brief → spec → code → verified output | `/frontend-design`, `/webapp-testing`, Web Search MCP |
| `distributing/` | Output → shipped to the world | `/humanizer`, `/pdf`, `/pptx` |

---

## Cross-Workspace Flow

```
writing/ (specs + docs → final/)
    ↓ final specs copy to building/workflows/01-briefs/
building/ (brief → spec → build → 04-output/)
    ↓ releases reference building/04-output/
distributing/ (release notes, announcements, deploys)
```
