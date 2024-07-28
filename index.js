import {program} from 'commander'
import setConfig from './set-config.js'
import generateCommit from './generate-commit.js'

program
  .command('set-config')
  .description('Set up the API key and other configurations')
  .action(setConfig);

program
  .command('generate')
  .description('Generate a commit message')
  .action(generateCommit);

program.parse(process.argv);