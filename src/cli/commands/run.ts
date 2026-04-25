import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { Command } from 'commander'
import { prepareRun } from '../../pipeline/orchestrator.js'
import { display } from '../display.js'

function writeToClipboard(text: string): boolean {
  let cmd: string
  let args: string[] = []
  if (process.platform === 'darwin') {
    cmd = 'pbcopy'
  } else if (process.platform === 'linux') {
    cmd = 'xclip'
    args = ['-selection', 'clipboard']
  } else if (process.platform === 'win32') {
    cmd = 'clip'
  } else {
    return false
  }
  const result = spawnSync(cmd, args, { input: text, encoding: 'utf-8' })
  return result.status === 0
}

export const runCommand = new Command('run')
  .argument('<agent-id>', 'agent to run — s-00 through s-04')
  .option('--project <path>', 'path to the Strata project', process.cwd())
  .option('--output <file>', 'write prompt to file instead of terminal')
  .option('--clipboard', 'copy prompt to clipboard instead of printing to terminal')
  .description('Prepare and output the prompt for an agent run')
  .action(async (agentId: string, options: { project: string; output?: string; clipboard?: boolean }) => {
    const projectPath = resolve(options.project)

    display.blank()
    display.info(`Preparing ${agentId.toUpperCase()} — checking prerequisites...`)

    let result
    try {
      result = await prepareRun(agentId, projectPath)
    } catch (err) {
      display.error((err as Error).message)
      process.exit(1)
    }

    if (!result.ready) {
      display.blank()
      display.error(`${agentId.toUpperCase()} is not ready`)
      display.info(`  Reason: ${result.reason}`)
      display.blank()
      display.info('  Run `strata status` to see the full pipeline state.')
      display.blank()
      process.exit(1)
    }

    if (result.prerequisitesMet.length > 0) {
      for (const prereq of result.prerequisitesMet) {
        display.success(prereq)
      }
    }

    const prompt = result.prompt!

    if (options.output) {
      const outPath = resolve(options.output)
      writeFileSync(outPath, prompt, 'utf-8')
      display.blank()
      display.success(`Prompt written to: ${outPath}`)
      display.info('  Open the file and paste its contents into Claude Code.')
    } else if (options.clipboard) {
      const ok = writeToClipboard(prompt)
      display.blank()
      if (ok) {
        display.success(`Prompt copied to clipboard  (${prompt.length.toLocaleString()} chars)`)
        display.info('  Paste into Claude Code, then run: strata status')
      } else {
        display.warn('Clipboard not available — printing to terminal instead.')
        display.prompt(prompt)
        display.info('  Copy the prompt above and paste it into Claude Code.')
      }
    } else {
      display.prompt(prompt)
      display.info('  Copy the prompt above and paste it into Claude Code.')
      display.info('  When the agent completes, run: strata status')
    }

    display.blank()
  })
