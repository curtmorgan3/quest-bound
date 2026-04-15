# `@quest-bound/runtime`

Campaign play, character sheet runtime, dice, inventory, and related UI utilities extracted from the Quest Bound app.

## Version policy

Published `@quest-bound/*` packages from this monorepo share the **same semver as the repository root** `package.json`. When you depend on `@quest-bound/runtime`, pin `@quest-bound/types` and `@quest-bound/cloud` to the **matching major.minor.patch** (or install only `runtime` and let npm dedupe siblings if you add them explicitly).

## Install

```bash
npm install @quest-bound/runtime react react-dom
```

You also need compatible versions of **`@quest-bound/types`** and **`@quest-bound/cloud`** (they are declared as both `dependencies` and `peerDependencies` so duplicate installs are visible and resolvable).

## Public entrypoints (`exports`)

| Subpath | Purpose |
| --- | --- |
| `@quest-bound/runtime` | Default barrel (currently re-exports realtime). |
| `@quest-bound/runtime/realtime` | Realtime campaign play, roster sync, channels. |
| `@quest-bound/runtime/join` | Join tokens, invite rows, joiner character helpers. |

Source is shipped as TypeScript; consumers should compile these modules with their bundler (same pattern as other workspace packages in this repo).

## Publishing

Packages remain `"private": true` until you intentionally publish. Before `npm publish`, set `private` to `false` on the packages you ship and ensure `files` includes everything intended for the tarball.
