# Style Guide

## Length

| Content Type | Target Length |
|-------------|--------------|
| Spec / PRD | As long as needed. No padding, no cutting for brevity's sake. |
| README | Under 500 words for simple tools. Longer only if the tool is complex. |
| Technical doc | One concept per doc. Split if it's covering two separate things. |
| Blog post | 600–1500 words. Under 600 is usually too shallow. Over 1500 usually needs splitting. |
| Changelog entry | 1-3 sentences per change. |
| Announcement | 100-300 words. |

---

## Structure

### Headers
- Use sentence case: `## What this does` not `## What This Does`
- Keep them short — they're navigation, not titles
- Don't skip levels: H1 → H2 → H3, never H1 → H3

### Lists
- Use bullets for unordered things (features, options, considerations)
- Use numbered lists for sequences (steps, ranked priorities)
- Don't convert everything into a list — prose works fine for continuous thought
- Max 7 items before breaking into sections

### Code Blocks
- Always specify the language: ` ```js ``` `, ` ```bash ``` `
- Use realistic variable names, not `foo`, `bar`, `myFunction`
- Include only what's relevant — strip setup boilerplate unless it's the point

### Tables
- Use tables for comparisons and reference data
- Don't use tables for content that flows naturally as prose

---

## Formatting Rules

- **Bold** for terms being defined or UI elements the reader needs to find
- `Code` for filenames, paths, function names, CLI commands, values
- _Italics_ sparingly — for emphasis, not decoration
- > Blockquotes for notable quotes or important callouts, not for general emphasis
- Avoid nested bullets more than 2 levels deep

---

## Spec / PRD Format

```markdown
# [Feature or Project Name]

## Problem
[One sentence. What breaks or is missing without this?]

## Solution
[What we're building. Not how — what.]

## Scope
**In scope:** [what's included]
**Out of scope:** [what's explicitly excluded]

## Acceptance Criteria
- [ ] [Specific, testable condition]
- [ ] [Specific, testable condition]

## Open Questions
- [Anything unresolved that needs a decision]
```

---

## README Format

```markdown
# [Project Name]

[One sentence description.]

## Install

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`js
// Minimal working example
\`\`\`

## API / Options

[Only if needed.]
```

---

## Changelog Format

```markdown
## [version] — YYYY-MM-DD

### Added
- [New capability]

### Changed
- [Modified behavior — include what changed and why if non-obvious]

### Fixed
- [Bug fixed — include the symptom, not just "fixed bug"]

### Removed
- [Removed feature — include migration path if relevant]
```
