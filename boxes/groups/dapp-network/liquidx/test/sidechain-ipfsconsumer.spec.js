import 'mocha';
require('babel-core/register');
require('babel-polyfill');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getNetwork, getCreateAccount } = require('../extensions/tools/eos/utils');
const { getEosWrapper } = require('../extensions/tools/eos/eos-wrapper');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { loadModels } = require('../extensions/tools/models');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = require('../extensions/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delaySec = sec => delay(sec * 1000);

var contractCode = 'ipfsconsumer';
var ctrt = artifacts.require(`./${contractCode}/`);
describe(`LiquidX Sidechain IPFS Service Test Contract`, () => {
  var testcontract;
  const code = 'test1';
  var eosvram;
  var sidechainName = 'test1';
  var sidechain;
  before(done => {
    (async() => {
      try {
        var sidechains = await loadModels('local-sidechains');
        sidechain = sidechains.find(a => a.name === sidechainName);
        await getCreateAccount(code, null, false, sidechain);
        await getCreateAccount(code, null, false);
        var deployedContract = await deployer.deploy(ctrt, code, null, sidechain);
        await genAllocateDAPPTokens(deployedContract, 'ipfs', '', 'default');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs(), sidechain);
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (account) {
          var keys = await getCreateKeys(account);
          config.keyProvider = keys.active.privateKey;
        }
        eosvram = deployedContract.eos;
        config.httpEndpoint = `http://localhost:${sidechain.nodeos_port}`;
        eosvram = getEosWrapper(config);

        testcontract = await eosvram.contract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  var account = code;
  it('sidechain - IPFS Write', done => {
    (async() => {
      try {
        var res = await testcontract.testset({
          data: {
            field1: 123,
            field2: new Buffer('hello-world').toString('hex'),
            field3: 312
          }
        }, {
          authorization: `${code}@active`,
        });
        // var eventResp = JSON.parse(res.processed.action_traces[0].console);
        // assert.equal(eventResp.etype, "service_request", "wrong etype");
        // assert.equal(eventResp.provider,"", "wrong provider");
        // assert.equal(eventResp.action, "commit", "wrong action");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sidechain - IPFS Read', done => {
    (async() => {
      try {
        var res = await testcontract.testget({
          uri: 'ipfs://zb2rhnyodRMHNeY4iaSVXzVhtFmYdWxsvddrhzhWZFUMiZdrd',
          expectedfield: 123
        }, {
          authorization: `${code}@active`,
        });
        // var eventResp = JSON.parse(res.processed.action_traces[0].console);
        // assert.equal(eventResp.etype, "service_request", "wrong etype");
        // assert.equal(eventResp.provider,"", "wrong provider");
        // assert.equal(eventResp.action, "cleanup", "wrong action");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sidechain - dapp::multi_index Get Available Key', done => {
    (async() => {
      try {
        await testcontract.increment({ somenumber: 1 }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 5 }, {
          authorization: `${code}@active`,
        });

        await testcontract.increment({ somenumber: 6 }, {
          authorization: `${code}@active`,
        });

        let table = await eosvram.getTableRows({
          code: code,
          scope: 'test',
          table: '.vconfig',
          json: true,
        });
        let next_key = table.rows[0].next_available_key;
        let shards = table.rows[0].shards;
        let buckets = table.rows[0].buckets_per_shard;

        assert.equal(next_key, 3, 'wrong key');
        assert.equal(shards, 1024, 'wrong shards');
        assert.equal(buckets, 64, 'wrong buckets');

        await testcontract.testindexa({
          id: 555
        }, {
          authorization: `${code}@active`,
        });

        await testcontract.testindexa({
          id: 20
        }, {
          authorization: `${code}@active`,
        });

        table = await eosvram.getTableRows({
          code: code,
          scope: 'test',
          table: '.vconfig',
          json: true,
        });
        next_key = table.rows[0].next_available_key;

        assert.equal(next_key, 556, 'wrong key');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('sidechain - dapp::multi_index Resize Should Fail', done => {
    (async() => {
      try {

        let failed = false;

        try {
          await testcontract.testresize({}, {
            authorization: `${code}@active`,
          });
        }
        catch (e) {
          failed = true
        }

        assert(failed, 'should have failed');
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


  it('sidechain - dapp::multi_index uint64_t Primary Key', done => {
    (async() => {
      try {

        await testcontract.testindexa({
          id: 12345
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 12345,
          table: "test",
          scope: code,
          sidechain
        });
        assert(tableRes.row.id == 12345, "wrong uint64_t");

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('sidechain - dapp::multi_index delayed cleanup', done => {
    (async() => {
      try {

        await testcontract.testdelay({
          id: 52343,
          value: 123,
          delay_sec: 15
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 124,
          delay_sec: 15
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 125,
          delay_sec: 5
        }, {
          authorization: `${code}@active`,
        });

        var tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          sidechain
        });
        assert(tableRes.row.sometestnumber == 125, "wrong uint64_t");
        await delaySec(10);
        tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          sidechain
        });
        assert(tableRes.row.sometestnumber == 125, "wrong uint64_t");
        await testcontract.testdelay({
          id: 52343,
          value: 126,
          delay_sec: 2
        }, {
          authorization: `${code}@active`,
        });
        await testcontract.testdelay({
          id: 52343,
          value: 127,
          delay_sec: 1
        }, {
          authorization: `${code}@active`,
        });

        tableRes = await readVRAMData({
          contract: code,
          key: 52343,
          table: "test",
          scope: code,
          sidechain
        });
        assert(tableRes.row.sometestnumber == 127, "wrong uint64_t");
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});
