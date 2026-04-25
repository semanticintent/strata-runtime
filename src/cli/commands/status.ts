import { resolve } from 'node:path'
import { Command } from 'commander'
import { readState, canRun } from '../../pipeline/state.js'
import { AGENTS } from '../../pipeline/agents.js'
import { pipelineSummary } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

export const statusCommand = new Command('status')
  .option('--project <path>', 'path to the Strata project', process.cwd())
  .option('--json', 'output pipeline state as JSON')
  .description('Show current pipeline state — agents, gates, artifact counts')
  .action((options: { project: string; json?: boolean }) => {
    const projectPath = resolve(options.project)

    let state
    try {
      state = readState(projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    if (options.json) {
      const nextAgent = AGENTS.find((a) => !state.agents[a.id] && canRun(a.id, state).can)
      const output = {
        project: state.project,
        path: state.path,
        nextAgent: nextAgent?.id ?? null,
        agents: AGENTS.map((a) => {
          const run = state.agents[a.id]
          return {
            id: a.id,
            name: a.name,
            status: run ? 'complete' : canRun(a.id, state).can ? 'ready' : 'waiting',
            confidence: run?.confidence ?? null,
            outputCount: run?.outputCount ?? null,
            completedAt: run?.completedAt ?? null,
            summary: run?.summary ?? null,
          }
        }),
        gates: Object.values(state.gates).map((g) => ({
          id: g.gateId,
          status: g.status,
          reviewedAt: g.reviewedAt ?? null,
          notes: g.notes ?? null,
        })),
      }
      console.log(JSON.stringify(output, null, 2))
      return
    }

    display.blank()
    console.log(pipelineSummary(state, projectPath))
    display.blank()
  })
