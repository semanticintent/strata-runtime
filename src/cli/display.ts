import chalk from 'chalk'

export const display = {
  success: (msg: string) => console.log(chalk.green('✓ ') + msg),
  error: (msg: string) => console.error(chalk.red('✗ ') + msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠ ') + msg),
  info: (msg: string) => console.log(chalk.dim(msg)),
  line: () => console.log(chalk.dim('─'.repeat(51))),
  blank: () => console.log(''),

  header: (title: string) => {
    console.log('')
    console.log(chalk.bold(title))
    console.log(chalk.dim('─'.repeat(51)))
  },

  label: (key: string, value: string) =>
    console.log(chalk.dim(key.padEnd(12)) + value),

  prompt: (text: string) => {
    const border = chalk.dim('─'.repeat(51))
    console.log('')
    console.log(border)
    console.log(chalk.bold.hex('#f97316')('  PROMPT — paste into Claude Code'))
    console.log(border)
    console.log('')
    console.log(text)
    console.log('')
    console.log(border)
    console.log('')
  },
}
