# Changelog

## [0.1.1] — 2026-06-09

### Added
- `strata validate` now performs **content validation** on every `.sil` file — not just existence checks
  - Parse errors: malformed files that fail the EMBER parser are reported with the error message
  - Type mismatches: files whose `CONSTRUCT` type doesn't match the expected construct for that agent are flagged
  - Low confidence: files with `confidence: low` produce warnings (exit 0) to prompt review before proceeding
  - `ArtifactValidation` result now includes `fileResults: FileValidation[]` and `parseErrors: string[]`
- CLI version now read dynamically from `package.json` — `strata --version` will always be correct
- VS Code extension (`semanticintent.phoenix-sil`) badge added to README

26 tests → 29 tests passing.

---

## [0.1.0] — 2026-04-25

Initial release.

### Added
- Phase 1 — SIL parser shim (delegates to `@semanticintent/ember`), pipeline state, agent registry
- Phase 2 — Orchestrator, prompt loader, project context injection
- Phase 3 — Full CLI: `init`, `run`, `status`, `gate`, `validate`, `complete`
- 5 agent prompt files (S-00 through S-04)
- 26 tests, coverage above thresholds
- Human gate: `artifacts-reviewed` required before S-04 (Classifier) can run
- Published to npm as `@semanticintent/strata-runtime`
- DOI minted: [10.5281/zenodo.19768151](https://doi.org/10.5281/zenodo.19768151)
