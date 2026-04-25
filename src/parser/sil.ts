// Thin shim — all parsing logic lives in @semanticintent/ember.

import {
  parse,
  read,
  write,
  readDir,
  getConfidence as _getConfidence,
} from '@semanticintent/ember'

export type { ConstructType } from '@semanticintent/ember'
export type { EmberConstruct as SilConstruct } from '@semanticintent/ember'

export const parseSil = parse
export const readSil = read
export const writeSil = write
export const readSilDir = readDir
export const getConfidence = _getConfidence
