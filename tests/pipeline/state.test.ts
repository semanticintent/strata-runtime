import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  initState,
  readState,
  writeState,
  canRun,
  markAgentComplete,
  approveGate,
  returnGate,
} from '../../src/pipeline/state.js'
import type { AgentRun } from '../../src/pipeline/state.js'

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `strata-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

const mockRun = (agentId: string): AgentRun => ({
  agentId,
  completedAt: new Date().toISOString(),
  outputCount: 3,
  confidence: 'high',
  summary: `${agentId} completed`,
})

describe('readState / writeState', () => {
  it('throws when no state file exists', () => {
    expect(() => readState(testDir)).toThrow('No .strata/state.json found')
  })

  it('round-trips state through write and read', () => {
    const state = initState(testDir, 'test-db')
    writeState(testDir, state)
    const loaded = readState(testDir)
    expect(loaded.project).toBe('test-db')
    expect(loaded.path).toBe(testDir)
    expect(loaded.agents).toEqual({})
    expect(loaded.gates).toEqual({})
  })

  it('creates .strata directory if missing', () => {
    const state = initState(testDir, 'test-db')
    writeState(testDir, state)
    expect(existsSync(join(testDir, '.strata', 'state.json'))).toBe(true)
  })
})

describe('canRun', () => {
  it('allows s-00 with no prerequisites', () => {
    const state = initState(testDir, 'test-db')
    const result = canRun('s-00', state)
    expect(result.can).toBe(true)
  })

  it('blocks s-01 when s-00 has not run', () => {
    const state = initState(testDir, 'test-db')
    const result = canRun('s-01', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('s-00')
  })

  it('allows s-01 after s-00 completes', () => {
    let state = initState(testDir, 'test-db')
    state = markAgentComplete('s-00', mockRun('s-00'), state)
    const result = canRun('s-01', state)
    expect(result.can).toBe(true)
  })

  it('blocks s-04 without artifacts-reviewed gate', () => {
    let state = initState(testDir, 'test-db')
    state = markAgentComplete('s-00', mockRun('s-00'), state)
    state = markAgentComplete('s-01', mockRun('s-01'), state)
    state = markAgentComplete('s-02', mockRun('s-02'), state)
    state = markAgentComplete('s-03', mockRun('s-03'), state)
    const result = canRun('s-04', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('artifacts-reviewed')
  })

  it('allows s-04 after gate is approved', () => {
    let state = initState(testDir, 'test-db')
    state = markAgentComplete('s-00', mockRun('s-00'), state)
    state = markAgentComplete('s-01', mockRun('s-01'), state)
    state = markAgentComplete('s-02', mockRun('s-02'), state)
    state = markAgentComplete('s-03', mockRun('s-03'), state)
    state = approveGate('artifacts-reviewed', 'looks good', state)
    const result = canRun('s-04', state)
    expect(result.can).toBe(true)
  })

  it('returns error for unknown agent', () => {
    const state = initState(testDir, 'test-db')
    const result = canRun('s-99', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('Unknown agent')
  })
})

describe('approveGate / returnGate', () => {
  it('approves a gate with notes', () => {
    let state = initState(testDir, 'test-db')
    state = approveGate('artifacts-reviewed', 'all artifacts look complete', state)
    expect(state.gates['artifacts-reviewed'].status).toBe('approved')
    expect(state.gates['artifacts-reviewed'].notes).toBe('all artifacts look complete')
    expect(state.gates['artifacts-reviewed'].reviewedAt).toBeTruthy()
  })

  it('returns a gate with notes', () => {
    let state = initState(testDir, 'test-db')
    state = returnGate('artifacts-reviewed', 'missing routine coverage for payment schema', state)
    expect(state.gates['artifacts-reviewed'].status).toBe('returned')
    expect(state.gates['artifacts-reviewed'].notes).toBe('missing routine coverage for payment schema')
  })
})
