import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS } from './agents.js'

export interface AgentRun {
  agentId: string
  completedAt: string
  outputCount: number
  confidence: 'high' | 'medium' | 'low'
  summary: string
}

export interface GateRecord {
  gateId: string
  status: 'pending' | 'approved' | 'returned'
  reviewedAt?: string
  reviewer?: string
  notes?: string
}

export interface PipelineState {
  project: string
  path: string
  createdAt: string
  updatedAt: string
  agents: Record<string, AgentRun>
  gates: Record<string, GateRecord>
}

const STATE_DIR = '.strata'
const STATE_FILE = 'state.json'

function statePath(projectPath: string): string {
  return join(projectPath, STATE_DIR, STATE_FILE)
}

export function initState(projectPath: string, projectName: string): PipelineState {
  return {
    project: projectName,
    path: projectPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agents: {},
    gates: {},
  }
}

export function readState(projectPath: string): PipelineState {
  const path = statePath(projectPath)
  if (!existsSync(path)) {
    throw new Error(`No .strata/state.json found at ${projectPath}. Run: strata init`)
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as PipelineState
}

export function writeState(projectPath: string, state: PipelineState): void {
  const dir = join(projectPath, STATE_DIR)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const updated = { ...state, updatedAt: new Date().toISOString() }
  writeFileSync(statePath(projectPath), JSON.stringify(updated, null, 2), 'utf-8')
}

export function canRun(
  agentId: string,
  state: PipelineState
): { can: boolean; reason?: string } {
  const agent = AGENTS.find((a) => a.id === agentId)
  if (!agent) return { can: false, reason: `Unknown agent: ${agentId}` }

  for (const reqAgent of agent.requires.agents) {
    if (!state.agents[reqAgent]) {
      return { can: false, reason: `${reqAgent} has not completed` }
    }
  }

  for (const reqGate of agent.requires.gates) {
    const gate = state.gates[reqGate]
    if (!gate || gate.status !== 'approved') {
      return { can: false, reason: `Gate "${reqGate}" is not approved` }
    }
  }

  return { can: true }
}

export function markAgentComplete(
  agentId: string,
  run: AgentRun,
  state: PipelineState
): PipelineState {
  return {
    ...state,
    agents: { ...state.agents, [agentId]: run },
  }
}

export function approveGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState {
  const record: GateRecord = {
    gateId,
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    notes,
  }
  return {
    ...state,
    gates: { ...state.gates, [gateId]: record },
  }
}

export function returnGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState {
  const record: GateRecord = {
    gateId,
    status: 'returned',
    reviewedAt: new Date().toISOString(),
    notes,
  }
  return {
    ...state,
    gates: { ...state.gates, [gateId]: record },
  }
}
