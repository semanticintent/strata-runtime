# strata-runtime

[![npm](https://img.shields.io/npm/v/@semanticintent/strata-runtime)](https://www.npmjs.com/package/@semanticintent/strata-runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Strata Database Archaeology Runtime** — orchestrate the 5-agent database excavation pipeline.

Manages `.sil` artifact state, enforces a human review gate before classification, and produces agent prompts ready to run in Claude Code or any AI interface.

```bash
strata init billing-db
strata run s-00
strata status
strata gate artifacts-reviewed --approve --notes "all schemas and routines look complete"
strata run s-04
```

## How It Works

The runtime does not call an AI API. It produces prompts. You paste them into Claude Code, Claude CLI, or any interface. This keeps the runtime lightweight, model-agnostic, and free of API key management.

State lives in `.strata/state.json` at your project root — human readable, git diffable, travels with the project.

## The Pipeline

| Agent | Name | Produces |
|-------|------|----------|
| S-00 | Schema Signal | One `.sil` per table, view, entity cluster |
| S-01 | Logic Extractor | One `.sil` per stored procedure, function, trigger |
| S-02 | Job Mapper | One `.sil` per SQL Agent job, SSIS package, linked server |
| S-03 | Dependency Tracer | FK chains, cross-schema refs, job-routine chains |
| S-04 | Classifier | `transform / preserve / retire` decision for every object |

Human review required after S-03 and before S-04 can run (`artifacts-reviewed` gate).

## Classification

Strata introduces three decisions for every database object:

- **transform** — reimplement in the target system (belongs in application layer)
- **preserve** — keep running in SQL Server (non-transformative: jobs, linked servers, maintenance)
- **retire** — decommission (unused, superseded, or safe to remove)

## Commands

```bash
strata init [name]               Initialize a new engagement
strata run <s-00..s-04>          Prepare and output the agent prompt
strata status                    Show pipeline state, gate status, artifact counts
strata complete <agent-id>       Mark an agent complete after an out-of-band run
strata gate <gate-id> --approve  Approve a human gate
strata gate <gate-id> --return   Return a gate for revision
strata validate <agent-id>       Check expected artifacts are present
```

## Artifact Language

All artifacts are `.sil` files — EMBER Semantic Intent Language. Requires `@semanticintent/ember` (included as a dependency).

```
CONSTRUCT  decision
ID         billing.dbo.sp_generate_invoice
VERSION    1
─────────────────────────────────────────
object:    dbo.sp_generate_invoice
type:      stored-procedure
decision:  transform
rationale: core billing logic — move to application service layer
risk:      high
depends-on: dbo.fn_calculate_tax, dbo.invoice, dbo.invoice_line
```

## Relationship to Phoenix

| | Phoenix | Strata |
|--|---------|--------|
| Target | Application codebases | SQL Server databases |
| Pipeline | 7 agents, greenfield rebuild | 5 agents, non-transformative archaeology |
| Gate | 7 human gates (A-05 passes) | 1 human gate (pre-classification review) |
| Output | Production codebase | transform/preserve/retire classification |
| State | `.phoenix/state.json` | `.strata/state.json` |

Both use EMBER `.sil` artifacts and the same prompt-based, model-agnostic pattern.

## Installation

```bash
npm install -g @semanticintent/strata-runtime
```

Or run without installing:

```bash
npx @semanticintent/strata-runtime init billing-db
```

## License

MIT — [Michael Shatny](https://semanticintent.dev)
