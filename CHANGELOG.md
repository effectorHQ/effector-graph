# Changelog

## v1.0.0 — 2026-03-19

First stable release. Package scoped to `@effectorhq/graph`.

### Added
- **Graph queries** — `npx @effectorhq/graph query --input CodeDiff` finds all compatible effectors
- **Path finding** — `npx @effectorhq/graph path A@v B@v` finds composition paths between two effectors
- **Export** — `npx @effectorhq/graph export --format json` for custom visualization
- **Registry loader** — loads effector definitions from local directories
- **Type-checked edges** — uses `@effectorhq/core` type compatibility for edge construction

### Changed
- Cross-repo imports replaced with `@effectorhq/core` package specifiers
- Package name: `effector-graph` → `@effectorhq/graph`
