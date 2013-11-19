# react-app-server-runtime

Node.js based runtime to evaluate client side code in. By default provides
minimalistic sandboxed runtime via `vm` Node's module.

## Installation

    % npm install react-app-server-runtime

## Usage

Basic usage:

    var evaluate = require('react-app-server-runtime');

    evaluate('__callback(null, "hello!");', function(err, message) {
      console.log(message); // outputs "hello!"
    });

