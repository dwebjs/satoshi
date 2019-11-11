var dns = require('dns')
var chalk = require('chalk')
var debug = require('debug')('@dwebjs/satoshi')
var runPublicTest = require('./public-test')
var whoamiTest = require('./whoami-test')

module.exports = function(opts) {
        if (!opts) opts = {}

        var SATOSHI_URL = 'satoshi.dwebs.io'
        var satoshiAddress = null
        var port = opts.port
        var skipUTP = false

        var tasks = [{
                title: 'Who am I?',
                task: function(state, bus, done) {
                    state.port = port
                    bus.on('error', function(err) {
                        if (!state.output) state.output = '  ' + chalk.dim(err)
                        else state.output += '\n  ' + chalk.dim(err)
                    })
                    whoamiTest(state, bus, done)
                }
            },
            {
                title: 'Checking dWeb Native Module Installation',
                task: nativeModuleTask
            },
            {
                title: 'Pinging the Dr. Satoshi',
                task: dnsLookupTask
            },
            {
                title: 'Checking dWeb Public Connections via TCP',
                task: function(state, bus, done) {
                    publicPeerTask(state, bus, { tcp: true, utp: false }, done)
                },
                skip: function(done) {
                    if (satoshiAddress) return done()
                    done(`Skipping... unable to reach ${SATOSHI_URL}`)
                }
            },
            {
                title: 'Checking dWeb Public Connections via UTP',
                task: function(state, bus, done) {
                    publicPeerTask(state, bus, { tcp: false, utp: true }, done)
                },
                skip: function(done) {
                    if (!satoshiAddress) {
                        return done(`Skipping... unable to reach ${SATOSHI_URL}`)
                    }
                    if (skipUTP) {
                        return done('Skipping... UTP not available')
                    }
                    return done()
                }
            }
        ]

        return tasks

        function dnsLookupTask(state, bus, done) {
            dns.lookup(SATOSHI_URL, function(err, address, _) {
                        if (err) {
                            state.title = 'Unable to reach the Dr. Satoshi Server'
                            return done(`Please check if you can resolve the url manually, ${chalk.reset.cyanBright(`ping ${SATOSHI_URL}`)}`)
      }
      state.title = 'Resolved Dr. Satoshi Server'
      satoshiAddress = address
      done()
    })
  }

  function nativeModuleTask (state, bus, done) {
    try {
      require('utp-native')
      state.title = 'Loaded native modules'
    } catch (err) {
      state.title = 'Error loading native modules'
      // TODO: link to FAQ/More Help
      skipUTP = true
      return done(`Unable to load utp-native.\n  This will make it harder to connect peer-to-peer.`)
    }
    done()
  }

  function publicPeerTask (state, bus, opts, done) {
    opts = Object.assign({ port: port, address: satoshiAddress }, opts)
    state.errors = []
    state.messages = []

    bus.on('error', (err) => {
      // TODO: persist these after task is done?
      debug('ERROR - ', err)
    })

    runPublicTest(state, bus, opts, function (err) {
      if (err) return done(err)
      done()
    })
  }
}