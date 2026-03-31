# Writing

## What This Workspace Is

Where ideas become polished specs, technical docs, READMEs, and blog posts. The agent researches, outlines, writes, and refines in the right voice. Final output goes to `final/` and can feed the build pipeline.

---

## What to Load

| Task | Load These | Skip These |
|------|-----------|------------|
| Write a spec or PRD | `docs/voice.md`, `docs/style-guide.md` | — |
| Write a README or technical doc | `docs/voice.md`, `docs/style-guide.md` | — |
| Write a blog post | `docs/voice.md`, `docs/style-guide.md` | — |
| Edit or review a draft | `docs/voice.md`, the draft itself | `docs/style-guide.md` |
| Research only | Nothing | Everything — just use Web Search MCP |

---

## Folder Structure

```
writing/
├── CONTEXT.md          ← You are here
├── docs/
│   ├── voice.md        ← How we communicate. Tone, personality, hard rules.
│   └── style-guide.md  ← Formatting, structure, length guidelines
├── drafts/             ← Work in progress ([slug]-[status].md)
└── final/              ← Ready to publish or hand off to building/
```

---

## The Process

1. **Understand the goal** — what's being written and who reads it?
2. **Find the angle** — for specs: what's the problem and solution? For posts: what's the specific take?
3. **Write it** — in the right voice, at the right depth
4. **Catch problems** — voice drift, unclear logic, weak opens/closes
5. **Run `/humanizer`** — before anything moves to `final/`

A draft becomes `review` when it's structurally complete. It becomes `final` when voice and quality pass.

---

## Skills & Tools

| Skill / Tool | When | Purpose |
|-------------|------|---------|
| `/humanizer` | **Before any draft moves to `final/`** — non-negotiable | Remove AI writing patterns. Apply suggestions. Re-check voice.md after. |
| Web Search MCP | **Research phase** — when the topic needs current data or technical verification | Search autonomously. Provide terms or derive from topic. |

---

## When a Draft Is Final

A `final` draft goes to one of two places:

1. **Spec or PRD** → copy to `../building/workflows/01-briefs/[slug].md` to start the build pipeline
2. **README, doc, or blog post** → ready for publishing (CMS, GitHub, docs site)

---

## What NOT to Do

- **Don't skip `voice.md`** — it's the difference between on-brand and generic
- **Don't load building docs here** — tech standards don't belong in a writing session
- **Don't write directly to `final/`** — everything passes through `drafts/` first
- **Don't skip `/humanizer`** — run it before every final promotion
