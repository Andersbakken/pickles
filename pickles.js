#!/usr/bin/env node
/*global require */

'use strict';

console.log("STARTING");
var zwave = require('./zwave');
zwave.start("/dev/ttyACM0");
console.log("STARTED");
