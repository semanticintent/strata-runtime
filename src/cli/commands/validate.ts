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

    if (result.missing.length > 0) {
      display.warn(`${result.missing.length} construct type(s) missing — re-run the agent.`)
      process.exit(1)
    } else {
      display.success('All expected artifacts present.')
      display.blank()
      display.info(`  If this agent ran out-of-band (e.g. in Claude Code), mark it complete:`)
      display.info(`  strata complete ${agentId} --confidence high --outputs <n> --summary "<what it produced>"`)
    }

    display.blank()
  })
