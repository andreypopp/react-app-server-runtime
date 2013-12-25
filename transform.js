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

var moduleStub = "module.exports = new Error('requires DOM');";

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
    var val = mapping[key];
    if (val === false) {
      resolved[key] = false;
    } else {
      return resolve(val, {basedir: dir}).then(function(id) {
        resolved[key] = id;
      });
    }
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

  // dir -> pkgMapping
  var pkgMappingCache= {};

  return function(filename) {
    var dirname = path.dirname(filename);
    var data = '';

    return through(
      function(chunk) { data += chunk; },
      function() {
        var self = this;

        function onError(err) {
          self.emit('error', err);
        }

        function onSuccess(pkgMapping) {
          pkgMappingCache[dirname] = pkgMapping;

          var map = extend(mapping, pkgMapping);
          var mapped = map[filename];
          if (mapped) {
            var id = './' + path.relative(dirname, mapped);
            data = makeModule(id);
          } else if (mapped === false) {
            data = moduleStub;
          }
          self.queue(data);
          self.queue(null);
        }

        var pkgMapping = pkgMappingCache[dirname];

        if (pkgMapping) {
          onSuccess(pkgMapping);
        } else {
          readMappingFromPackage('react-app-server-runtime', filename)
            .then(onSuccess, onError)
        }
      });
  }
}

module.exports = makeTransform();
module.exports.makeTransform = makeTransform;
