# Tech Standards

## Code Quality

### General
- Write code that reads like prose — the next developer shouldn't need to ask you what it does
- Functions do one thing. If you need "and" to describe what a function does, split it.
- Prefer explicit over implicit. Clever code is a maintenance liability.
- Delete dead code. Comments explaining removed behavior are noise.

### Naming
- Variables and functions: `camelCase`
- Classes and types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ext`
- Names should describe what something IS or DOES, not how it's implemented
  - Good: `getUserById`, `isAuthenticated`, `MAX_RETRIES`
  - Bad: `getData`, `flag`, `temp`, `x`

### Functions
- Max ~30 lines per function. If it's longer, it's doing too much.
- Return early. Flat logic beats nested conditionals.
- Pure functions are preferred — same input, same output, no side effects

### Comments
- Comment WHY, not WHAT. The code shows what. The comment explains intent.
- If a comment explains what the code does, the code probably needs to be rewritten.
- TODO comments must include context: `// TODO: remove after v3 migration completes`

---

## Error Handling

- Fail loudly in development, fail gracefully in production
- Never silently swallow errors: `catch(e) {}` is banned
- User-facing errors: friendly message. Dev logs: full stack trace.
- Validate inputs at system boundaries (API routes, user input, file parsing). Trust internal code.

---

## Testing

### What to Test
- Business logic: always
- API endpoints: always
- UI components: critical paths and edge cases
- Pure utility functions: always
- Implementation details: never (test behavior, not internals)

### Test Naming
```
[unit under test] [scenario] [expected outcome]
getUserById / when user does not exist / throws NotFoundError
```

### Coverage
- Aim for meaningful coverage, not a coverage number
- A test that doesn't catch real bugs is noise
- 100% coverage with bad tests is worse than 80% coverage with good ones

---

## Architecture

### Separation of Concerns
- Business logic belongs in services/domain, not in controllers or UI components
- Data access belongs in repositories/models, not in business logic
- UI belongs in components, not mixed with data fetching

### Dependencies
- Prefer fewer, well-maintained dependencies over many small ones
- Before adding a dependency, ask: can this be done in 10 lines of code?
- Pin dependency versions in production. Use ranges in libraries.

### File Organization
```
src/
├── [feature]/          ← Feature-first organization
│   ├── [feature].ts    ← Core logic
│   ├── [feature].test.ts
│   └── index.ts        ← Public API
└── shared/             ← Cross-feature utilities
```

---

## Security

- Never commit secrets. Use environment variables.
- Validate and sanitize all user input before using it
- Parameterize all database queries — no string interpolation in SQL
- Log access to sensitive data. Don't log the data itself.
- Keep dependencies updated. Run `npm audit` or equivalent regularly.

---

## Git

- Commit messages: `type: short description` (e.g., `fix: handle null user in auth`)
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`
- One logical change per commit
- Branch naming: `[type]/[slug]` (e.g., `feat/user-auth`, `fix/login-redirect`)
- PRs require at minimum one review before merge to main

---

## Definition of Done

A task is done when:
- [ ] Code passes linting with zero warnings
- [ ] All tests pass
- [ ] New behavior has tests
- [ ] No console.logs or debug artifacts left in
- [ ] PR description explains what changed and why
- [ ] Reviewed and approved
