# CLI for LLM-generated Quest Bound content

## Purpose

A CLI that an **LLM agent** (e.g. Cursor, another AI) can use while Quest Bound runs locally to programmatically create ruleset content from a PDF rulebook. The application does **not** call any external APIs; the agent invokes the CLI and may call an LLM separately. Outputs include **intermediate markdown** for review and editing. PDF handling assumes **OCR** is needed; **tables are treated as unreliable** and surfaced in markdown for correction.

---

## Data models (reference)

Source: `src/types/data-model-types.ts`, `src/types/helper-types.ts`.

- **BaseDetails**: `id`, `createdAt`, `updatedAt` (all entities).
- **Ruleset**: `version`, `createdBy`, `title`, `description`, `details`, `assetId`, `image`, `palette`, `isModule`, `modules`.
- **Attribute**: `rulesetId`, `title`, `description`, `category`, `type` (`'string'|'number'|'boolean'|'list'`), `options?`, `defaultValue`, `optionsChartRef?`, `optionsChartColumnHeader?`, `min?`, `max?`, `scriptId?`, etc.
- **Action**: `rulesetId`, `title`, `description`, `category`, `scriptId?`, etc.
- **Item**: `rulesetId`, `title`, `description`, `category`, `weight`, `defaultQuantity`, `stackSize`, `isContainer`, `isStorable`, `isEquippable`, `isConsumable`, `inventoryWidth/Height`, `scriptId?`, `customProperties?`, etc.
- **Chart**: `rulesetId`, `title`, `description`, `category`, `data` (string: JSON array of rows, each row string[]).
- **Script**: `rulesetId`, `name`, `sourceCode`, `entityType` (`'attribute'|'action'|'item'|'archetype'|'global'`), `entityId`, `isGlobal`, `enabled`, `category?`.
- **Window**: `rulesetId`, `title`, `category?`, `description?`.
- **RulesetWindow**: `rulesetId`, `title`, `rulesetPageId?`, `windowId`, `x`, `y`, `isCollapsed`.
- **Page**: `label`, `category?`, `assetId`, `backgroundOpacity`, `backgroundColor`, etc.
- **RulesetPage**: `rulesetId`, `pageId`.
- **Component**: `rulesetId`, `windowId`, `type`, `x`, `y`, `z`, `height`, `width`, `rotation`, `data`, `style`, `attributeId?`, `actionId?`, `childWindowId?`, etc.
- **Archetype**: `rulesetId`, `name`, `description`, `scriptId?`, `testCharacterId`, `isDefault`, `loadOrder`, etc.

IDs are strings; timestamps are ISO strings.

---

## QBScript (reference)

Source: `src/lib/compass-logic/QBScript.md`.

- **Script types**: Attribute (reactive, `subscribe(...)` + `return`), Action (`on_activate`, optional `on_deactivate`, optional `Target`), Item (`on_activate`, `on_equip`, `on_unequip`, `on_consume`), Archetype (`on_add`, `on_remove`), Global (shared functions/variables).
- **Syntax**: Python-like blocks (indentation), C-like operators; strings with `{{variable}}` interpolation; `Owner`, `Ruleset`, `Self`; `getAttr('name')`, `getChart('name')`, `roll('1d6')`, etc.
- **Charts**: `getChart('name')`, `.rowWhere('col', value)`, `.valueInColumn('col')`, `.get('col')`, `.randomCell()`, etc.

Generated scripts must conform to this syntax and event signatures so they run correctly in Quest Bound.

---

## Quest Bound export/import format (target for generated rulesets)

Source: `use-export-ruleset.ts`, `use-import-ruleset.ts`. Generated rulesets should produce a **ZIP** compatible with QB import so the agent (or user) can import it into the local app.

- **Root**: `attributes.tsv`, `actions.tsv`, `items.tsv`, `README.md`, optional `{ruleset_title}.md` (description).
- **application data/**: `metadata.json` (ruleset, exportInfo, counts, scripts metadata), `charts.json`, `windows.json`, `components.json`, `archetypes.json`, `pages.json`, `rulesetPages.json`, `rulesetWindows.json`, etc.
- **charts/** (root): TSV per chart, named `{safeTitle}_{id}.tsv`.
- **scripts/** (root): `.qbs` files under `scripts/global/`, `scripts/attributes/`, `scripts/actions/`, `scripts/items/`, `scripts/archetypes/`; metadata in `metadata.json` under `scripts` array (id, name, file, entityType, entityId, entityName, isGlobal, enabled, category).
- **assets/**, **fonts/**, **documents/**: binary assets as needed.

Chart `data` in DB is a JSON string of `string[][]`; in export, chart content is in TSV files and metadata in `application data/charts.json`.

---

## CLI design (agent-oriented)

- **No API calls** from the CLI or from any QB code invoked by it; all input is local (PDF, config, existing files).
- **Subcommand-based**: each operation is a subcommand so the agent can call exactly what it needs.
- **Output**: Intermediate artifacts in **markdown**; final ruleset as **ZIP** (and optionally a project dir with TSV/JSON/markdown for incremental edits).
- **Idempotent / scriptable**: Prefer flags over interactive prompts; optional `--yes` or `--force` where overwrite is possible.
- **Structured logs**: Clear stdout for “result” (paths, counts, IDs); stderr or a log file for progress/errors so the agent can parse outcomes.

Suggested subcommands (to be refined in implementation):

| Subcommand | Purpose |
|------------|--------|
| `extract` | PDF → OCR → plain text + optional page/section splits. Output: `--out-dir` with `.txt` and/or `.md` files. |
| `tables` | From extracted text (or PDF), detect/list tables and output as markdown tables in `--out-dir` (e.g. `tables/`). Unreliable tables are still emitted with optional confidence/flags. |
| `sections` | Chunk rulebook into sections (by headings or page ranges). Output: markdown files per section (intermediate content for mechanics, attributes, items, etc.). |
| `propose` | From sections + tables markdown, output **proposed** entities in markdown (attributes, items, actions, charts, scripts, windows, pages, archetypes) without writing a ruleset yet. Enables agent/ human to edit before generation. |
| `generate` | From proposed markdown (and/or edited) + ruleset metadata (title, version), generate the full ruleset ZIP (and optionally a project dir with TSV/JSON/scripts). |
| `validate` | Validate a project dir or ZIP: schema, script syntax (QBScript), chart TSV shape, cross-references (scriptId → entity, optionsChartRef → chart). |
| `import-path` | (Optional) Print or accept the path where QB stores data / where to place an importable ZIP so the agent can tell the user “import this file.” |

---

## PDF and tables

- **OCR**: Assume PDFs may be scanned or image-based; use an OCR-capable pipeline (e.g. Tesseract via a Node binding or CLI wrapper, or a library that supports OCR). Text-only PDFs can skip OCR.
- **Tables**: Treat as unreliable. Pipeline: extract or infer table regions → output as **markdown tables** in intermediate files. Agent or human can fix tables in markdown; `propose` / `generate` read from these markdown files. Optionally tag low-confidence tables in markdown (e.g. `<!-- low-confidence -->`) for review.

---

## Intermediate markdown (contract for agent)

All intermediate outputs live under a project or `--out-dir` in markdown so the agent can read, edit, and re-run.

1. **Extracted text**: One file per page or per section (e.g. `pages/01.md`, `sections/character-creation.md`).
2. **Tables**: `tables/` with one file per table or one file aggregating tables, as markdown tables; optional frontmatter or comments for source page, confidence.
3. **Proposed entities**: e.g. `proposed/attributes.md`, `proposed/items.md`, `proposed/actions.md`, `proposed/charts.md`, `proposed/scripts.md` (with QBScript snippets), `proposed/windows.md`, `proposed/pages.md`, `proposed/archetypes.md`. Format: structured markdown or embedded YAML/JSON blocks so `generate` can parse them and produce the ruleset ZIP.

Schema for “proposed” markdown can be defined in a later pass (e.g. YAML frontmatter + markdown body, or small JSON/TSV snippets per entity).

---

## Where the CLI lives

- **In-repo**: e.g. `packages/cli/` or `scripts/ruleset-cli/` inside the Quest Bound repo.
- **Interaction with local QB**: File-based only. The CLI writes a **ZIP** (and optionally a project directory). The user (or agent) imports the ZIP via the existing Quest Bound UI (or a future “import from path” if added). The CLI does **not** talk to the running app’s IndexedDB or network.

---

## Implementation order (suggested)

1. **Project layout** for the CLI (package name, entrypoint, subcommands stub).
2. **`extract`**: PDF → text (with OCR path); output markdown/text to `--out-dir`.
3. **`tables`**: Parse/extract tables from text or PDF → markdown tables in `--out-dir`.
4. **`sections`**: Chunk text into section markdown files (heuristic or simple heading-based).
5. **`propose`**: Define proposed-entity markdown format; from sections + tables, emit proposed attributes, items, actions, charts, scripts, windows, pages, archetypes (scripts as QBScript snippets per QBScript.md).
6. **`generate`**: Read proposed markdown + metadata → build in-memory entities → output ZIP matching QB export format (and optionally project dir with TSV/JSON/scripts).
7. **`validate`**: Validate project dir or ZIP (schema, QBScript parse, references).
8. **Docs**: Update `agents/cli.md` and add a short README in the CLI package for the agent (subcommands, flags, where to find outputs).

---

## Open decisions

- **PDF/OCR library**: Choose a Node-friendly stack (e.g. `pdf-parse` + `tesseract.js` or child_process to Tesseract CLI; or Poppler + Tesseract). Prefer one that works in the repo’s Node version and supports OCR.
- **Proposed-entity format**: Exact schema for `proposed/*.md` (YAML frontmatter vs JSON blocks vs custom markdown tables) to be fixed when implementing `propose` and `generate`.
- **ID generation**: New entities need stable IDs (e.g. nanoid or UUID); ensure they match between metadata.json, TSV, and script metadata when generating the ZIP.
