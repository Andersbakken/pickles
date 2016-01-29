#!/usr/bin/env node
/*global require */

'use strict';

console.log("STARTING");

var openzwave = require('openzwave-shared');
var instance = new openzwave();
instance.connect("/dev/ttyACM0");
instance.on("node event", function(nodeId, value) {
    console.log("GOT NODE EVENT", value);
});

// var zwave = require('./zwave');
// zwave.start("/dev/ttyACM0");
// console.log("STARTED");
