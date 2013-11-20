"use strict";

var __prepareStackTrace = Error.prepareStackTrace;

function prepareStackTrace(error, stack) {
  // restore original prepareStackTrace so if we throw some error we don't get
  // in infinite loop
  Error.prepareStackTrace = __prepareStackTrace;

  // no source map were defined
  if (typeof __sourceMap === 'undefined' || !__sourceMap)
    return __prepareStackTrace.call(Error, error, stack);

  var stackTrace = error + '\n' + stack.map(function(frame) {
    var source = frame.getFileName() || frame.getScriptNameOrSourceURL(),
        name = frame.getMethodName() || frame.getFunctionName(),
        position = {
          source: source,
          line: frame.getLineNumber(),
          column: frame.getColumnNumber()
        };

    if (position.source === undefined || position.source === 'undefined') {
      position = __sourceMap.originalPositionFor(position);
    }
    return '    at ' + name + ' (' + position.source + ':' + position.line + ':0)';
  }).join('\n');

  // all is ok, we can use our prepareStackTrace impl firther
  Error.prepareStackTrace = prepareStackTrace;

  return stackTrace;
}

Error.prepareStackTrace = prepareStackTrace;
