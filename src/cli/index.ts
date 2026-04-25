import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { runCommand } from './commands/run.js'
import { statusCommand } from './commands/status.js'
import { gateCommand } from './commands/gate.js'
import { validateCommand } from './commands/validate.js'
import { completeCommand } from './commands/complete.js'

const program = new Command()

program
  .name('strata')
  .description('Strata Database Archaeology Runtime — orchestrate the 5-agent database excavation pipeline')
  .version('0.1.0')

program.addCommand(initCommand)
program.addCommand(runCommand)
program.addCommand(statusCommand)
program.addCommand(gateCommand)
program.addCommand(validateCommand)
program.addCommand(completeCommand)

program.parse()
