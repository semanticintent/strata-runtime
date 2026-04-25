import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Command } from 'commander'
import { initState, writeState } from '../../pipeline/state.js'
import { display } from '../display.js'

const DIRS = ['schemas', 'routines', 'jobs', 'dependencies', 'decisions']

const SEPARATOR = '─'.repeat(41)

function surveyTemplate(projectName: string): string {
  return [
    'CONSTRUCT  signal',
    `ID         _survey`,
    'VERSION    1',
    SEPARATOR,
    `project:   ${projectName}`,
    `database:  (database name)`,
    `server:    (SQL Server instance)`,
    `version:   (SQL Server version — e.g. 2019, 2022)`,
    ``,
    `estimated-tables:    (approximate table count)`,
    `estimated-routines:  (stored procedures + functions)`,
    `estimated-jobs:      (SQL Agent jobs)`,
    ``,
    `domain:    (business domain — e.g. billing, order management, HR)`,
    `age:       (approximate age of the database — e.g. 12 years)`,
    ``,
    `notes:     (anything worth flagging before excavation starts)`,
  ].join('\n')
}

export const initCommand = new Command('init')
  .argument('[project-name]', 'name for the engagement (defaults to current directory name)')
  .option('--project <path>', 'path to initialize (defaults to current directory)', process.cwd())
  .description('Initialize a new Strata engagement in the current directory')
  .action((projectName: string | undefined, options: { project: string }) => {
    const projectPath = options.project
    const name = projectName ?? basename(projectPath)
    const stateFile = join(projectPath, '.strata', 'state.json')

    if (existsSync(stateFile)) {
      display.warn(`Already initialized: ${stateFile}`)
      display.info('Remove .strata/state.json to reinitialize.')
      process.exit(1)
    }

    for (const dir of DIRS) {
      mkdirSync(join(projectPath, dir), { recursive: true })
    }

    const state = initState(projectPath, name)
    writeState(projectPath, state)

    const surveyPath = join(projectPath, '_survey.sil')
    if (!existsSync(surveyPath)) {
      writeFileSync(surveyPath, surveyTemplate(name), 'utf-8')
    }

    display.blank()
    display.success(`Initialized Strata engagement: ${name}`)
    display.blank()
    display.info('  Directories created:')
    for (const dir of DIRS) display.info(`    /${dir}/`)
    display.blank()
    display.info('  Files created:')
    display.info('    _survey.sil          ← fill this in before running S-00')
    display.info('    .strata/state.json')
    display.blank()
    display.info('  Next: edit _survey.sil, then run:')
    display.info('    strata run s-00')
    display.blank()
  })
