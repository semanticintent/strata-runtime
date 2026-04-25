import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS, getAgent } from './agents.js'
import { readState, canRun, type PipelineState } from './state.js'
import { loadPrompt, runtimeRoot } from '../prompts/loader.js'
import type { ConstructType } from '../parser/sil.js'

export interface RunResult {
  agentId: string
  ready: boolean
  reason?: string
  prompt?: string
  prerequisitesMet: string[]
}

export interface ArtifactValidation {
  agentId: string
  expected: ConstructType[]
  found: Record<ConstructType, number>
  missing: ConstructType[]
  lowConfidence: string[]
}

const CONSTRUCT_DIRS: Partial<Record<ConstructType, string>> = {
  schema: 'schemas',
  routine: 'routines',
  job: 'jobs',
  dependency: 'dependencies',
  decision: 'decisions',
}

function artifactDir(projectPath: string, construct: ConstructType): string {
  return join(projectPath, CONSTRUCT_DIRS[construct] ?? construct)
}

function countArtifacts(projectPath: string, construct: ConstructType): number {
  const dir = artifactDir(projectPath, construct)
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((f) => f.endsWith('.sil')).length
}

const STATUS_ICON: Record<string, string> = {
  complete: '✓',
  running: '⟳',
  waiting: '○',
}

export function pipelineSummary(state: PipelineState, projectPath: string): string {
  const lines: string[] = []
  const line = '─'.repeat(51)

  lines.push(`PROJECT: ${state.project}`)
  lines.push(`PATH:    ${state.path}`)
  lines.push(line)
  lines.push('')
  lines.push('PIPELINE')

  for (const agent of AGENTS) {
    const run = state.agents[agent.id]
    const check = canRun(agent.id, state)

    let statusLabel: string
    let confidenceLabel: string
    let detail: string

    if (run) {
      statusLabel = STATUS_ICON.complete
      confidenceLabel = (run.confidence ?? 'unknown').padEnd(6)
      const count = run.outputCount
      const produces = agent.produces[0]
      detail = `${count} ${produces}${count !== 1 ? 's' : ''}`
    } else if (check.can) {
      statusLabel = STATUS_ICON.running
      confidenceLabel = '—     '
      detail = 'ready to run'
    } else {
      statusLabel = STATUS_ICON.waiting
      confidenceLabel = '—     '
      detail = `prereq: ${check.reason}`
    }

    lines.push(
      `  ${agent.id.toUpperCase()}  ${statusLabel}  ${confidenceLabel}  ${detail}`
    )
  }

  lines.push('')
  lines.push('HUMAN GATES')

  const allGates = ['artifacts-reviewed']

  for (const gateId of allGates) {
    const gate = state.gates[gateId]
    const icon = gate?.status === 'approved' ? '✓' : gate?.status === 'returned' ? '✗' : '○'
    const label = gate?.status ?? 'pending'
    lines.push(`  ${gateId.padEnd(24)} ${icon}  ${label}`)
  }

  lines.push('')
  lines.push('ARTIFACT COUNTS')

  const constructs: ConstructType[] = ['schema', 'routine', 'job', 'dependency', 'decision']
  for (const c of constructs) {
    const count = countArtifacts(projectPath, c)
    lines.push(`  /${CONSTRUCT_DIRS[c]}/`.padEnd(20) + `${count} files`)
  }

  lines.push(line)

  const nextAgent = AGENTS.find((a) => !state.agents[a.id] && canRun(a.id, state).can)
  if (nextAgent) {
    lines.push(`Next: strata run ${nextAgent.id} --project .`)
  }

  return lines.join('\n')
}

function buildProjectContext(
  agentId: string,
  state: PipelineState,
  projectPath: string
): string {
  const agent = getAgent(agentId)!
  const line = '─'.repeat(42)

  const readDirs = agent.requires.constructs.map((c) => {
    const count = countArtifacts(projectPath, c)
    return `  ${artifactDir(projectPath, c)}     (${count} .sil files)`
  })

  const surveyPath = join(projectPath, '_survey.sil')
  if (existsSync(surveyPath) && !readDirs.some((l) => l.includes('_survey'))) {
    readDirs.unshift(`  ${surveyPath}`)
  }

  const writeDirs = agent.produces.map((c) => `  ${artifactDir(projectPath, c)}/`)

  const lines = [
    'PROJECT CONTEXT',
    line,
    `Project: ${state.project}`,
    `Path:    ${state.path}`,
    '',
    'READ FROM:',
    ...readDirs,
    '',
    'WRITE TO:',
    ...writeDirs,
    '',
    'PIPELINE STATE:',
    pipelineSummary(state, projectPath),
  ]

  return lines.join('\n')
}

export async function prepareRun(
  agentId: string,
  projectPath: string
): Promise<RunResult> {
  const agent = getAgent(agentId)
  if (!agent) {
    return { agentId, ready: false, reason: `Unknown agent: ${agentId}`, prerequisitesMet: [] }
  }

  const state = readState(projectPath)

  const check = canRun(agentId, state)
  if (!check.can) {
    return { agentId, ready: false, reason: check.reason, prerequisitesMet: [] }
  }

  const prerequisitesMet = [
    ...agent.requires.agents.map((a) => `${a} complete`),
    ...agent.requires.gates.map((g) => `gate ${g} approved`),
  ]

  const agentPrompt = loadPrompt(agent.promptFile, runtimeRoot())
  const projectContext = buildProjectContext(agentId, state, projectPath)

  const parts: string[] = []
  parts.push(projectContext)
  parts.push(agentPrompt)

  const prompt = parts.join('\n\n' + '─'.repeat(42) + '\n\n')

  return {
    agentId,
    ready: true,
    prompt,
    prerequisitesMet,
  }
}

export function validateArtifacts(
  agentId: string,
  projectPath: string
): ArtifactValidation {
  const agent = getAgent(agentId)
  if (!agent) throw new Error(`Unknown agent: ${agentId}`)

  const found: Partial<Record<ConstructType, number>> = {}
  const missing: ConstructType[] = []

  for (const construct of agent.produces) {
    const count = countArtifacts(projectPath, construct)
    found[construct] = count
    if (count === 0) missing.push(construct)
  }

  return {
    agentId,
    expected: agent.produces,
    found: found as Record<ConstructType, number>,
    missing,
    lowConfidence: [],
  }
}
