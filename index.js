"use strict";

var fs                  = require('fs');
var domain              = require('domain');
var SourceMapConsumer   = require('source-map').SourceMapConsumer;
var utils               = require('lodash');
var vmRuntime           = require('./vm-runtime');

/**
 * Return source map information for a specified source or null
 */
function retrieveSourceMap(source) {
  var match = /\/\/[#@]\s*sourceMappingURL=(.*)\s*$/m.exec(source);
  if (!match) return null;
  var sourceMappingURL = match[1];

  var sourceMapData;
  var dataUrlPrefix = "data:application/json;base64,";
  if (sourceMappingURL.slice(0, dataUrlPrefix.length).toLowerCase() == dataUrlPrefix) {
    sourceMapData = new Buffer(sourceMappingURL.slice(dataUrlPrefix.length), "base64").toString();
  }

  if (!sourceMapData)
    return null;

  return new SourceMapConsumer(sourceMapData);
}

var patchStackTraceSrc = fs.readFileSync(
    require.resolve('./patch-stack-trace.js'),
    'utf8');

/**
 * Evaluate code in a context
 *
 * @param {Object} opts
 * @param {Callback} cb
 */
function evaluate(opts, cb) {
  var dom = domain.create();
  var runtime = opts.runtime ? opts.runtime : vmRuntime;

  if (utils.isString(opts))
    opts = {code: opts};

  dom.on('error', cb);
  dom.run(function() {

    try {
      if (opts.debug && !opts.sourceMap && utils.isString(opts.bundle))
        opts.sourceMap = retrieveSourceMap(opts.bundle);

      var bundle = utils.isString(opts.bundle) ?
        runtime.createScript(opts.bundle) :
        opts.bundle;

      var code = utils.isString(opts.code) ?
        runtime.createScript(opts.code) :
        opts.code;

      var sandbox = {
        __callback: cb,
        __sourceMap: (opts.sourceMap && opts.debug) ? opts.sourceMap : null,
        location: opts.location,
      };

      if (opts.sandbox)
        utils.assign(sandbox, opts.sandbox);

      var ctx = runtime.createContext(sandbox);

      if (opts.sourceMap && opts.debug) {
        var patchStackTraceScript = runtime.createScript(patchStackTraceSrc);
        runtime.evaluate(ctx, patchStackTraceScript);
      }

      if (bundle)
        runtime.evaluate(ctx, bundle);
      if (code)
        runtime.evaluate(ctx, code);

    } catch(err) {
      cb(err);
    }
  });
}

module.exports = evaluate;
