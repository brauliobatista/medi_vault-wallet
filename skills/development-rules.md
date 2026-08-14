# Skill: Development Rules

## Trigger
Load this skill at the start of every ticket/task in this project, whenever writing or fixing code, and again before opening or merging a Pull Request.

## Rules

### Testing
- Every ticket must include automated tests covering the change.
- Automated tests must pass before the task is considered finished — never hand off or close a ticket with a failing test suite.
- Every bug fix must add a regression test: a test that reproduces the bug (fails without the fix, passes with it).
- Tests must always end with an assertion — never leave a test that only exercises code without checking the result.
- Every new or changed backend API endpoint (Controller action) needs **both**:
  - A **unit test** for the underlying Service method, in `backend/MediVault.Api.Tests/Services/` — business logic in isolation, no HTTP.
  - An **API test** for the Controller endpoint itself, in `backend/MediVault.Api.Tests/Api/` (one `*ControllerTests.cs` file per controller) — a real HTTP request through `ApiTestFactory` (`WebApplicationFactory<Program>` + isolated in-memory SQLite), covering the happy path plus the unhappy paths that apply: 401 no token, 403 wrong role/ownership, 404 not found, 400 validation.
  - These check different things: the unit test can't catch a wrong `[Authorize(Roles=...)]` or route; the API test is too slow/coarse to cover every business-logic branch. Neither replaces the other.
  - CI runs them as separate jobs (`backend-unit`, `backend-api` in `.github/workflows/ci.yml`) — keep new tests in the matching folder so the `--filter` split (`FullyQualifiedName~MediVault.Api.Tests.Api`) keeps working.

### Code style
- New code must follow the same patterns and conventions already used in the codebase (naming, structure, error handling, layer boundaries, etc.). Do not introduce a different style for the same kind of code — match what's already there instead of inventing an alternative.
- No dead code or commented-out code, and no leftover debug statements (`console.log`, `Debug.WriteLine`, etc.) in a PR.

### Secrets
- Passwords, tokens, API keys, and connection strings with credentials must never appear in code or committed files (`appsettings.json`, `.env`, etc.). Use environment variables, `dotnet user-secrets` for local backend development, and repository/CI secrets in pipelines.
- If a secret was ever committed, removing it from the file is not enough — it must be rotated (treat it as compromised, since it stays in git history).

### Git / PR workflow
- No direct commits to `main` — every change goes through a Pull Request.
- A PR needs at least one reviewer approval before it can be merged.
- Branch names follow the ticket key (`KAN##-short-description`).
- Claude must never run `git commit` or `git push` in this repo — make the file changes only and leave committing and pushing to the developer, every time, no exceptions.

## Checklist before finishing a ticket

- [ ] Automated tests added for the change (and for the bug being fixed, if applicable)
- [ ] New/changed API endpoints have both a Service unit test and a Controller API test
- [ ] Full test suite passes locally / in CI
- [ ] Code matches existing patterns in the codebase, no dead/commented-out code or debug statements left behind
- [ ] No secrets committed (checked `appsettings.json`, `.env`, and diffs for hardcoded credentials)
- [ ] Changes pushed on a branch named after the ticket, not committed directly to `main`
- [ ] PR opened and has at least one reviewer approval before merging
