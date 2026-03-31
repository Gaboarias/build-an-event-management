# Distributing

## What This Workspace Is

The last mile. Verified builds from building/ get packaged, released, and announced here. This workspace doesn't create — it ships.

---

## What to Load

| Task | Load These | Also Pull From |
|------|-----------|---------------|
| Write release notes | `docs/channels.md` | Build output from `../building/workflows/04-output/` |
| Write a changelog | `docs/channels.md` | Commit history or brief from `../writing/final/` |
| Write a launch announcement | `docs/channels.md` | `../writing/docs/voice.md` for tone |
| Deploy to production | `docs/channels.md` | The release artifact from `../building/workflows/04-output/` |
| Publish a package | `docs/channels.md` | The build output |
| Create a pitch deck or slides | — | `../writing/docs/voice.md`, build deliverables as assets |

---

## Folder Structure

```
distributing/
├── CONTEXT.md              ← You are here
├── docs/
│   └── channels.md         ← Where things ship, how, and what each channel requires
└── content/
    ├── release-notes/      ← [YYYY-MM-DD]-[slug].md
    ├── announcements/      ← [platform]-[slug].md
    └── changelogs/         ← [slug].md
```

---

## The Process

1. **Confirm what's being shipped** — pull from `building/workflows/04-output/`
2. **Check channels.md** — what channels need updating for this type of release?
3. **Write the release artifacts** — release notes, changelog, announcements
4. **Run `/humanizer`** on any public-facing written content
5. **Execute the release** — package publish, deploy, post announcements

---

## Skills & Tools

| Skill / Tool | When | Purpose |
|-------------|------|---------|
| `/humanizer` | **Before any public announcement** — non-negotiable | Remove AI writing patterns from release notes and announcements |
| `/pdf` | **Downloadable release docs or guides** | Generate PDF from markdown release documentation |
| `/pptx` | **Presentations, pitch decks, conference talks** | Generate PowerPoint slide decks |

---

## What NOT to Do

- **Don't ship unverified builds** — if it didn't pass testing in building/, it doesn't ship
- **Don't write announcements without checking voice.md** — community-facing content needs the right tone
- **Don't skip `/humanizer`** — announcements and release notes are the most public-facing content you produce
- **Don't duplicate changelog and release notes** — release notes are narrative (what changed, why it matters), changelogs are reference (version, date, list of changes)
