const { testProvidersList } = require('../../tools/eos/dapp-services');
const serviceRunner = require('../../helpers/service-runner');

module.exports = async (args) => {
    if (args.creator !== 'eosio') { return; } // only local
    for (var pi = 0; pi < testProvidersList.length; pi++) {
        var testProvider = testProvidersList[pi];
        await serviceRunner(`/dummy/demux`, 3195 * (pi + 1)).handler(args, {
            NODEOS_HOST: 'localhost',
            TEST_ENV: true,
            NODEOS_PORT: 8888,
            WEBHOOK_DAPP_PORT: 8812 * (pi + 1),
            NODEOS_WEBSOCKET_PORT: 8889,
            DSP_ACCOUNT: testProvider
        });
    }
};
