# Distribution Channels

## What to Update for Each Release Type

| Release Type | Channels to Update |
|-------------|-------------------|
| Major version (breaking changes) | GitHub Release, Changelog, npm/registry, Blog post, All announcements |
| Minor version (new features) | GitHub Release, Changelog, npm/registry, Social announcement |
| Patch (bug fix) | GitHub Release, Changelog, npm/registry |
| Internal / pre-release | GitHub Release (pre-release tag), internal Slack |
| Docs-only update | Docs site, optional social post |

---

## Channels

### GitHub Releases
- **What goes here:** The canonical release record
- **Content:** Version number, date, summary of changes, links to full changelog
- **Format:** Markdown. Keep it scannable — users land here from package changelogs.
- **Tag format:** `v[MAJOR].[MINOR].[PATCH]` (e.g., `v2.1.0`)

### Changelog (CHANGELOG.md)
- **What goes here:** Cumulative history of all changes
- **Content:** Follows Keep a Changelog format — Added, Changed, Fixed, Removed sections
- **Format:** See `../../writing/docs/style-guide.md` → Changelog Format
- **Location:** Root of the repo (`CHANGELOG.md`) or `distributing/content/changelogs/`

### npm / Package Registry
- **What goes here:** Published package artifact
- **Pre-publish checklist:**
  - Version bumped in `package.json`
  - Build passes all tests
  - README is current
  - No dev dependencies or debug artifacts included
- **Command:** `npm publish` (or equivalent for your registry)

### Blog / Docs Site
- **What goes here:** Long-form release posts for major versions and significant features
- **Content:** What changed, why it matters, migration guide if needed, code examples
- **Source:** Write in `../../writing/drafts/`, finalize in `../../writing/final/`, publish here
- **Format:** Follow writing/ voice and style guide

### Social (Twitter/X, LinkedIn, etc.)
- **What goes here:** Short announcements driving traffic to the GitHub release or blog post
- **Content:** The hook (what's new), the value (why it matters), the link
- **File:** `distributing/content/announcements/[platform]-[slug].md`
- **Twitter/X:** Max 280 characters per tweet. Use threads for bigger releases.
- **LinkedIn:** 1-3 short paragraphs. Technical but accessible.

### Internal Channels (Slack, Discord, etc.)
- **What goes here:** Internal heads-up for team and early adopters
- **Content:** Brief, direct. What shipped, where to find it, what to test.

---

## Release Checklist

Before any public release:

- [ ] Build artifact exists in `building/workflows/04-output/`
- [ ] All tests pass
- [ ] Version number is correct and consistent across all files
- [ ] CHANGELOG.md is updated
- [ ] README reflects any new behavior
- [ ] Release notes drafted and `/humanizer` run
- [ ] GitHub Release created
- [ ] Package published to registry
- [ ] Announcement posted to relevant channels

---

## Versioning

Follow Semantic Versioning (semver):

| Bump | When |
|------|------|
| **MAJOR** (v2.0.0) | Breaking changes — existing code may need updates |
| **MINOR** (v1.3.0) | New features — fully backward compatible |
| **PATCH** (v1.2.1) | Bug fixes — no behavior changes for existing users |

Pre-releases: `v2.0.0-beta.1`, `v2.0.0-rc.1`
