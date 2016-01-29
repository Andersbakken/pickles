#!/usr/bin/env node
/*global require */

'use strict';

console.log("STARTING");

var openzwave = new require('openzwave-shared');
openzwave.connect("/dev/ttyACM0");
openzwave.on("node event", function(nodeId, value) {
    console.log("GOT NODE EVENT", value);
});

// var zwave = require('./zwave');
// zwave.start("/dev/ttyACM0");
// console.log("STARTED");
