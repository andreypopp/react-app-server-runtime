"use strict";
/**
 * Browserify source transform which allows shim modules
 */

var fs              = require('fs');
var path            = require('path');
var kew             = require('kew');
var extend          = require('xtend');
var resolveCb       = require('resolve');
var through         = require('through');
var findParentDirCb = require('find-parent-dir');

function makeModule(id) {
  return "module.exports = require('" + id + "');";
}

function promisify(func) {
  return function() {
    var promise = kew.defer();
    Array.prototype.push.call(arguments, promise.makeNodeResolver());
    func.apply(this, arguments);
    return promise;
  }
}

var findParentDir = promisify(findParentDirCb);
var readFile = promisify(fs.readFile);
var resolve = promisify(resolveCb);

function resolveMappingDomain(mapping, dir) {
  var resolved = {};
  var resolutions = Object.keys(mapping).map(function(key) {
    return resolve(key, {basedir: dir}).then(function(id) {
      resolved[id] = mapping[key];
    });
  });
  return kew.all(resolutions).then(function() { return resolved; });
}

function resolveMappingImage(mapping, dir) {
  var resolved = {};
  var resolutions = Object.keys(mapping).map(function(key) {
    return resolve(mapping[key], {basedir: dir}).then(function(id) {
      resolved[key] = id;
    });
  });
  return kew.all(resolutions).then(function() { return resolved; });
}

function resolveMapping(mapping, dir) {
  return resolveMappingDomain(mapping, dir).then(function(mapping) {
    return resolveMappingImage(mapping, dir)
  });
}

function getPackage(filename) {
  return findParentDir(path.dirname(filename), 'package.json')
  .then(function(dir) {
    return readFile(path.join(dir, 'package.json'), 'utf8')
    .then(function(data) {
      data = JSON.parse(data);
      return {dir: dir, data: data};
    });
  });
}

function readMappingFromPackage(key, filename) {
  return getPackage(filename).then(function(pkg) {
    return resolveMapping(pkg.data[key] || {}, pkg.dir);
  });
}

function makeTransform(mapping) {
  mapping = mapping || {};

  return function(filename) {
    var data = '';

    return through(
      function(chunk) { data += chunk; },
      function() {
        var self = this;

        function onError(err) {
          self.emit('error', err);
        }

        readMappingFromPackage('react-app-server-runtime', filename)
          .then(function(pkgMapping) {
            var map = extend(mapping, pkgMapping);
            console.log(map, filename);
            var mapped = map[filename];
            if (mapped) {
              var id = './' + path.relative(path.dirname(filename), mapped);
              data = makeModule(id);
            }
            self.queue(data);
            self.queue(null);
          }, onError)
      });
  }
}

module.exports = makeTransform();
module.exports.makeTransform = makeTransform;
