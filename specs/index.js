var assert    = require('assert');
var evaluate  = require('../index');

describe('react-app-server-runtime', function() {
  
  it('works (simplified calling convention)', function(done) {
    evaluate('__callback(null, "hello!");', function(err, message) {
      assert.ok(!err, err);
      assert.equal(message, "hello!");
      done();
    });
  });

  it('works', function(done) {
    evaluate({code: '__callback(null, "hello!");'}, function(err, message) {
      assert.ok(!err, err);
      assert.equal(message, "hello!");
      done();
    });
  });

  it('propagates errors', function(done) {
    evaluate({code: '__callback(new Error("x"));'}, function(err, message) {
      assert.ok(err);
      assert.equal(err.message, 'x');
      done();
    });
  });

  it('propagates syntax errors', function(done) {
    evaluate({code: '__callback new Error("x"));'}, function(err, message) {
      assert.ok(err);
      done();
    });
  });

  it('allows enrich sandbox with custom values', function(done) {
    evaluate({code: '__callback(null, v);', sandbox: {v: "h"}}, function(err, message) {
      assert.ok(!err, err);
      assert.equal(message, "h");
      done();
    });
  });
});
