"use strict";

var vm                  = require('vm');
var makeXMLHttpRequest  = require('./xmlhttprequest');

module.exports = {

  createContext: function(globals) {
    var sandbox = {
      XMLHttpRequest: makeXMLHttpRequest(globals.location),
      console: console,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval
    };

    for (var k in globals) {
      sandbox[k] = globals[k];
    }

    sandbox.self = sandbox;

    return vm.createContext(sandbox);
  },

  createScript: function(code) {
    return vm.createScript(code);
  },

  evaluate: function(ctx, script) {
    return script.runInContext(ctx);
  }
};
