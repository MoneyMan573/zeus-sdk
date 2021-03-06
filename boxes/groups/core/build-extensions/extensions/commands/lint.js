var path = require('path');
var { execScripts } = require('../helpers/_exec');

module.exports = {
  description: 'lint code',
  builder: (yargs) => {
    yargs
      .option('all', {
        describe: 'lint all contracts',
        default: true
      }).example('$0 lint --all').example('$0 lint helloworld');
  },
  command: 'lint [contract]',
  handler: async (args) => {
    await execScripts(path.resolve(__dirname, './lint'), (script) => {
      console.log('running linter', path.basename(script));
      return [args];
    }, args);
  }
};
