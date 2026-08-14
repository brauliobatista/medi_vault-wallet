---
name: skills-guide
description: Index of MediVault project skills stored in the skills/ folder — read this to know which skill file to load for a given task.
---

# MediVault Skills Guide

This project's knowledge base lives as individual skill files in [`skills/`](../../skills), not as commands. Read the relevant file(s) below before starting work that matches its trigger — do not guess from the filename alone.

| Skill file | Trigger |
|---|---|
| [`business-context.md`](../../skills/business-context.md) | Start of every session on this project, or whenever context is needed about what MediVault is, who the users are, or the business model. |
| [`development-rules.md`](../../skills/development-rules.md) | Start of every ticket/task, whenever writing or fixing code, and before opening or merging a Pull Request — testing, code style, and Git/PR workflow rules. |
| [`database-sync.md`](../../skills/database-sync.md) | Any database schema change — new table, column add/remove/rename, type change, new constraint. Requires updating all 4 dialect files, the ERD, the seed script, and Confluence together. |
| [`confluence-field-tables.md`](../../skills/confluence-field-tables.md) | Whenever a table/column is added, removed, renamed, or retyped on the Confluence schema page — runs as part of `database-sync.md`'s checklist. |
| [`recreate-db.md`](../../skills/recreate-db.md) | Recreating the local SQLite database from scratch (stop API, delete DB, reapply schema + seed, restart API). |
| [`frontend-layout.md`](../../skills/frontend-layout.md) | Creating a new page in `frontend/medivault-web`, or working on the shared sidebar/topbar layout (`Layout.tsx`, `index.css`). |

## When given a ticket to work on

Read all 6 skills below before starting, in this order:

1. [`development-rules.md`](../../skills/development-rules.md)
2. [`frontend-layout.md`](../../skills/frontend-layout.md)
3. [`recreate-db.md`](../../skills/recreate-db.md)
4. [`business-context.md`](../../skills/business-context.md)
5. [`database-sync.md`](../../skills/database-sync.md)
6. [`confluence-field-tables.md`](../../skills/confluence-field-tables.md)

## Adding a new skill

1. Create the new file in `skills/`, starting with `# Skill: <Name>` and a `## Trigger` section describing exactly when to load it.
2. Add a row to the table above.
