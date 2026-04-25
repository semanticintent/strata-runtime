import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { prepareRun, pipelineSummary, validateArtifacts } from '../../src/pipeline/orchestrator.js'
import { initState, writeState, markAgentComplete, approveGate, returnGate } from '../../src/pipeline/state.js'
import { AGENTS } from '../../src/pipeline/agents.js'
import type { AgentRun } from '../../src/pipeline/state.js'

const FIXTURES = join(import.meta.dirname, '../fixtures')

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `strata-orch-test-${Date.now()}`)
  for (const dir of ['schemas', 'routines', 'jobs', 'dependencies', 'decisions', 'agents']) {
    mkdirSync(join(testDir, dir), { recursive: true })
  }
  mkdirSync(join(testDir, '.strata'), { recursive: true })
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

const mockRun = (agentId: string, outputCount = 3): AgentRun => ({
  agentId,
  completedAt: new Date().toISOString(),
  outputCount,
  confidence: 'high',
  summary: `${agentId} completed`,
})

function writeAgentPrompt(agentId: string) {
  const agent = AGENTS.find((a) => a.id === agentId)!
  const filePath = join(testDir, agent.promptFile)
  writeFileSync(filePath, `# ${agent.name}\nYou are the ${agent.name} agent.`)
}

function setupProjectWithS00() {
  let state = initState(testDir, 'test-db')
  state = markAgentComplete('s-00', mockRun('s-00', 8), state)
  writeState(testDir, state)

  cpSync(
    join(FIXTURES, 'billing.dbo.invoice.schema.sil'),
    join(testDir, 'schemas', 'billing.dbo.invoice.sil')
  )
  writeFileSync(join(testDir, '_survey.sil'), [
    'CONSTRUCT  signal',
    'ID         _survey',
    'VERSION    1',
    '─────────────────────────────────────────',
    'project:   test-db',
    'database:  BillingDB',
  ].join('\n'))
}

describe('prepareRun — not ready', () => {
  it('returns not ready for unknown agent', async () => {
    const state = initState(testDir, 'test-db')
    writeState(testDir, state)
    const result = await prepareRun('s-99', testDir)
    expect(result.ready).toBe(false)
    expect(result.reason).toContain('Unknown agent')
  })

  it('returns not ready when prerequisites not met', async () => {
    const state = initState(testDir, 'test-db')
    writeState(testDir, state)
    const result = await prepareRun('s-01', testDir)
    expect(result.ready).toBe(false)
    expect(result.reason).toContain('s-00')
    expect(result.prerequisitesMet).toHaveLength(0)
  })
})

describe('prepareRun — ready', () => {
  it('returns ready with prompt when prerequisites are met', async () => {
    setupProjectWithS00()
    writeAgentPrompt('s-01')
    process.env['STRATA_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('s-01', testDir)
    expect(result.ready).toBe(true)
    expect(result.prompt).toBeDefined()
    expect(result.prerequisitesMet).toContain('s-00 complete')
  })

  it('prompt includes project context — READ FROM and WRITE TO', async () => {
    setupProjectWithS00()
    writeAgentPrompt('s-01')
    process.env['STRATA_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('s-01', testDir)
    expect(result.prompt).toContain('PROJECT CONTEXT')
    expect(result.prompt).toContain('READ FROM')
    expect(result.prompt).toContain('WRITE TO')
    expect(result.prompt).toContain('routines')
  })

  it('prompt includes agent instructions', async () => {
    setupProjectWithS00()
    writeAgentPrompt('s-01')
    process.env['STRATA_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('s-01', testDir)
    expect(result.prompt).toContain('Logic Extractor')
  })
})

describe('pipelineSummary', () => {
  it('shows all five agents', () => {
    const state = initState(testDir, 'test-db')
    const summary = pipelineSummary(state, testDir)
    for (const id of ['S-00', 'S-01', 'S-02', 'S-03', 'S-04']) {
      expect(summary).toContain(id)
    }
  })

  it('shows ✓ for completed agents', () => {
    let state = initState(testDir, 'test-db')
    state = markAgentComplete('s-00', mockRun('s-00', 8), state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('✓')
  })

  it('shows next action hint', () => {
    const state = initState(testDir, 'test-db')
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('strata run s-00')
  })

  it('shows approved gate with ✓', () => {
    let state = initState(testDir, 'test-db')
    state = approveGate('artifacts-reviewed', 'all good', state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('artifacts-reviewed')
    expect(summary).toContain('approved')
    expect(summary).toContain('✓')
  })

  it('shows returned gate with ✗', () => {
    let state = initState(testDir, 'test-db')
    state = returnGate('artifacts-reviewed', 'need more routine coverage', state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('artifacts-reviewed')
    expect(summary).toContain('returned')
    expect(summary).toContain('✗')
  })

  it('shows no next action hint when all agents complete', () => {
    let state = initState(testDir, 'test-db')
    const allIds = ['s-00', 's-01', 's-02', 's-03', 's-04']
    for (const id of allIds) state = markAgentComplete(id, mockRun(id), state)
    state = approveGate('artifacts-reviewed', '', state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).not.toContain('Next: strata run')
  })

  it('counts zero artifacts when directory does not exist', () => {
    const fresh = join(tmpdir(), `strata-fresh-${Date.now()}`)
    mkdirSync(fresh, { recursive: true })
    const result = validateArtifacts('s-00', fresh)
    expect(result.found['schema']).toBe(0)
    rmSync(fresh, { recursive: true })
  })
})

describe('validateArtifacts', () => {
  it('reports missing constructs when directory is empty', () => {
    const result = validateArtifacts('s-01', testDir)
    expect(result.agentId).toBe('s-01')
    expect(result.missing).toContain('routine')
  })

  it('reports zero missing when files exist', () => {
    cpSync(
      join(FIXTURES, 'billing.dbo.invoice.schema.sil'),
      join(testDir, 'routines', 'billing.dbo.sp_generate_invoice.sil')
    )
    const result = validateArtifacts('s-01', testDir)
    expect(result.found['routine']).toBe(1)
    expect(result.missing).not.toContain('routine')
  })

  it('throws for unknown agent', () => {
    expect(() => validateArtifacts('s-99', testDir)).toThrow('Unknown agent')
  })
})
