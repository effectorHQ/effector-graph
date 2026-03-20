# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2026-03-19

First stable release. Published as `@effectorhq/graph`.

### Added
- **Capability graph** — builds a directed graph of effector definitions with typed edges (edge exists when output type of A is compatible with input type of B)
- **CLI subcommands**:
  - `query --input <type>` — find all effectors compatible with a given input type
  - `query --output <type>` — find all effectors that produce a given output type
  - `path <effectorA> <effectorB>` — find composition paths between two effectors
  - `export --format json` — export full graph as JSON for custom visualization
- **Type-checked edges** — uses `@effectorhq/core` `checkTypeCompatibility()` for edge construction
- **Registry loader** — discovers effector definitions from local directories
- 12 tests

### Changed
- All cross-repo relative imports replaced with `@effectorhq/core ^1.0.0` package specifier
- Package name: `effector-graph` → `@effectorhq/graph`
- `dependencies` updated from `file:../effector-core` → `"@effectorhq/core": "^1.0.0"`
- `files` field: `["src/", "bin/", "README.md", "LICENSE"]`
- `prepublishOnly` script added
