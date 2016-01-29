#!/usr/bin/env node
/*global require */

'use strict';

console.log("STARTING");
var zwave = require('./zwave');
zwave.start();
console.log("STARTED");
