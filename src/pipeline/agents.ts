import type { ConstructType } from '../parser/sil.js'

export interface AgentDefinition {
  id: string
  name: string
  promptFile: string
  requires: {
    agents: string[]
    gates: string[]
    constructs: ConstructType[]
  }
  produces: ConstructType[]
  humanGate: boolean
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 's-00',
    name: 'Schema Signal',
    promptFile: 'agents/S-00-SCHEMA-SIGNAL.md',
    requires: { agents: [], gates: [], constructs: [] },
    produces: ['schema'],
    humanGate: false,
  },
  {
    id: 's-01',
    name: 'Logic Extractor',
    promptFile: 'agents/S-01-LOGIC-EXTRACTOR.md',
    requires: { agents: ['s-00'], gates: [], constructs: ['schema'] },
    produces: ['routine'],
    humanGate: false,
  },
  {
    id: 's-02',
    name: 'Job Mapper',
    promptFile: 'agents/S-02-JOB-MAPPER.md',
    requires: { agents: ['s-01'], gates: [], constructs: ['schema', 'routine'] },
    produces: ['job'],
    humanGate: false,
  },
  {
    id: 's-03',
    name: 'Dependency Tracer',
    promptFile: 'agents/S-03-DEPENDENCY-TRACER.md',
    requires: { agents: ['s-02'], gates: [], constructs: ['schema', 'routine', 'job'] },
    produces: ['dependency'],
    humanGate: false,
  },
  {
    id: 's-04',
    name: 'Classifier',
    promptFile: 'agents/S-04-CLASSIFIER.md',
    requires: {
      agents: ['s-03'],
      gates: ['artifacts-reviewed'],
      constructs: ['schema', 'routine', 'job', 'dependency'],
    },
    produces: ['decision'],
    humanGate: true,
  },
]

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id)
}
