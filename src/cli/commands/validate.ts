import { resolve } from 'node:path'
import { Command } from 'commander'
import { validateArtifacts } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

export const validateCommand = new Command('validate')
  .argument('<agent-id>', 'agent whose outputs to validate — s-00 through s-04')
  .option('--project <path>', 'path to the Strata project', process.cwd())
  .description('Check that all expected artifact outputs exist for a completed agent')
  .action((agentId: string, options: { project: string }) => {
    const projectPath = resolve(options.project)

    let result
    try {
      result = validateArtifacts(agentId, projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    display.blank()
    display.header(`Artifact validation — ${agentId.toUpperCase()}`)

    for (const construct of result.expected) {
      const count = result.found[construct] ?? 0
      const missing = result.missing.includes(construct)
      if (missing) {
        display.error(`${construct.padEnd(16)} 0 files — missing`)
      } else {
        display.success(`${construct.padEnd(16)} ${count} file${count !== 1 ? 's' : ''}`)
      }
    }

    display.blank()

    if (result.parseErrors.length > 0) {
      display.header('Content issues — parse errors')
      for (const f of result.fileResults.filter((r) => r.error)) {
        display.error(`  ${f.file}: parse error — ${f.error}`)
      }
      display.blank()
    }

    const mismatches = result.fileResults.filter((r) => r.constructMismatch)
    if (mismatches.length > 0) {
      display.header('Content issues — type mismatches')
      for (const f of mismatches) {
        display.error(`  ${f.file}: expected ${f.constructMismatch!.expected}, found ${f.constructMismatch!.found}`)
      }
      display.blank()
    }

    if (result.lowConfidence.length > 0) {
      display.header('Warnings — low confidence')
      for (const f of result.lowConfidence) {
        display.warn(`  ${f}: confidence: low — review before proceeding`)
      }
      display.blank()
    }

    const hardErrors = result.missing.length + result.parseErrors.length + mismatches.length
    const summary = [
      `${result.missing.length} missing`,
      result.parseErrors.length > 0 ? `${result.parseErrors.length} parse error(s)` : null,
      mismatches.length > 0 ? `${mismatches.length} type mismatch(es)` : null,
    ].filter(Boolean).join(' · ')

    if (hardErrors > 0) {
      display.warn(summary)
      process.exit(1)
    } else {
      display.success('All expected artifacts present and valid.')
      if (result.lowConfidence.length > 0) {
        display.warn(`${result.lowConfidence.length} low-confidence file(s) flagged above.`)
      }
      display.blank()
      display.info(`  If this agent ran out-of-band (e.g. in Claude Code), mark it complete:`)
      display.info(`  strata complete ${agentId} --confidence high --outputs <n> --summary "<what it produced>"`)
    }

    display.blank()
  })
