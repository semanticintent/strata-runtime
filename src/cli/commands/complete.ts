import { resolve } from 'node:path'
import { Command } from 'commander'
import { readState, writeState, markAgentComplete } from '../../pipeline/state.js'
import { getAgent } from '../../pipeline/agents.js'
import { display } from '../display.js'
import type { AgentRun } from '../../pipeline/state.js'

export const completeCommand = new Command('complete')
  .argument('<agent-id>', 'agent to mark complete — s-00 through s-04')
  .option('--project <path>', 'path to the Strata project', process.cwd())
  .option('--confidence <level>', 'confidence level: high | medium | low', 'high')
  .option('--outputs <n>', 'number of artifacts produced', '0')
  .option('--summary <text>', 'one-line summary of what the agent produced', '')
  .description('Mark an agent as complete after an out-of-band run (e.g. in Claude Code)')
  .action((agentId: string, options: { project: string; confidence: string; outputs: string; summary: string }) => {
    const projectPath = resolve(options.project)

    const agent = getAgent(agentId)
    if (!agent) {
      display.error(`Unknown agent: ${agentId}`)
      process.exit(1)
    }

    const confidence = options.confidence as 'high' | 'medium' | 'low'
    if (!['high', 'medium', 'low'].includes(confidence)) {
      display.error(`--confidence must be high, medium, or low`)
      process.exit(1)
    }

    let state
    try {
      state = readState(projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    const run: AgentRun = {
      agentId,
      completedAt: new Date().toISOString(),
      outputCount: parseInt(options.outputs, 10),
      confidence,
      summary: options.summary || `${agentId} marked complete via CLI`,
    }

    const updated = markAgentComplete(agentId, run, state)
    writeState(projectPath, updated)

    display.blank()
    display.success(`${agentId.toUpperCase()} marked complete`)
    display.blank()
    display.info(`  confidence:  ${run.confidence}`)
    display.info(`  outputs:     ${run.outputCount}`)
    display.info(`  summary:     ${run.summary}`)
    display.info(`  completedAt: ${run.completedAt}`)
    display.blank()
  })
