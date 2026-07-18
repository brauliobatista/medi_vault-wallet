# Skill: Confluence Field Tables

## Trigger
Use this skill whenever a table is added, removed, renamed, or has a column
added/removed/renamed/retyped on the Confluence page "Esquema de Base de
Dados - MediVault" (page ID `22740994`) — i.e. every time
[`database-sync.md`](database-sync.md) runs, its checklist item "Confluence
page updated" means running this skill.

## Rule
Every table section on the Confluence page (`<h3>TABLE_NAME</h3>` +
description `<p>`) must be immediately followed by an HTML field table with
three columns: **Campo**, **Tipo**, **Chave**. One row per column in the
table, in the same order as the table's `CREATE TABLE` statement /
[`database/erd.md`](../database/erd.md) block.

## Type vocabulary

Use the same labels as `database/erd.md` (dialect-agnostic), not a specific
SQL dialect's type names:

`guid`, `string`, `int`, `bool`, `date`, `datetime`, `decimal`, `text`,
`json`, `binary`

## Table HTML format

```html
<table>
<tbody>
<tr><th>Campo</th><th>Tipo</th><th>Chave</th></tr>
<tr><td><code>id</code></td><td>guid</td><td>PK</td></tr>
<tr><td><code>user_id</code></td><td>guid</td><td>FK</td></tr>
<tr><td><code>email</code></td><td>string</td><td>UK</td></tr>
<tr><td><code>created_at</code></td><td>datetime</td><td></td></tr>
</tbody>
</table>
```

- **Campo**: wrap the column name in `<code>...</code>`.
- **Tipo**: plain text, from the vocabulary above.
- **Chave**: `PK`, `FK`, or `UK` — empty string if none. Only one per row
  (matches the `erd.md` convention of picking the most specific).

## Update procedure (via Chrome MCP REST API)

Same mechanism as `database-sync.md`'s Confluence update — the user must be
logged into Confluence in the browser.

### Step 1 — fetch current body + version
```javascript
const res = await fetch('/wiki/rest/api/content/22740994?expand=body.storage,version', {
  headers: { 'Accept': 'application/json' }
});
const data = await res.json();
```

### Step 2 — for each changed table, locate and inject/update
Find `<h3>TABLE_NAME</h3>`, then the first `<p>...</p>` after it (the
description paragraph), then insert the field table immediately after that
paragraph's closing `</p>`. If a field table already exists for that
table (i.e. this is an update, not a new table), replace the existing
`<table>...</table>` block instead of inserting a duplicate.

When adding a brand-new table to the page, add both the description
`<p>` and its field table together, in the correct numbered section.

### Step 3 — PUT with version + 1
Same `PUT /wiki/rest/api/content/22740994` call as `database-sync.md`,
incrementing `version.number` by 1.

## Gotchas

- **Duplicate column names across tables.** A plain string replace on a row
  like `<tr><td><code>institution_id</code></td>...` can match the *wrong*
  table if the same column name is FK'd from more than one place (e.g.
  `institution_id` appears in both `DOCTORS` and `INSTITUTION_LICENSES`).
  Always locate the target `<h3>TABLE_NAME</h3>` first, then search for the
  row starting from that offset (`body.indexOf(row, headerIdx)`), not a
  global replace.
- **Do the fetch, transform, and PUT in one `javascript_exec` call.**
  Splitting them across multiple calls risks losing `window.__*` state if
  the tab navigates in between (observed in practice — a stray navigation
  reset the page context and silently dropped an in-progress edit). Fetch
  the current body, apply every transformation, and PUT — all inside a
  single script.

## Checklist before finishing
- [ ] Every added/changed/removed table has its field table added/updated/removed
- [ ] Column order in the table matches the schema files / `erd.md`
- [ ] Type labels use the `erd.md` vocabulary, not a SQL-dialect-specific type
- [ ] `Chave` column only has `PK`, `FK`, `UK`, or empty
- [ ] No duplicate field tables left behind under a single `<h3>`
- [ ] Confluence version number incremented correctly (no conflicting PUT)
