import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../')

export function runtimeRoot(): string {
  return process.env['STRATA_RUNTIME_ROOT'] ?? PACKAGE_ROOT
}

export function loadPrompt(promptFile: string, root: string = PACKAGE_ROOT): string {
  const filePath = join(root, promptFile)
  if (!existsSync(filePath)) {
    throw new Error(
      `Agent prompt not found: ${filePath}\n` +
        `Ensure agents/ directory is populated in ${root}`
    )
  }
  return readFileSync(filePath, 'utf-8')
}
