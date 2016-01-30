#!/usr/bin/env node
/*global require, __dirname, clearTimeout, setTimeout, process */

/*

 TODO:
 * handle bad startup, wait for event and restart if it doesn't initialize right
 * Maybe verify that we don't get two closes or opens in a row
 * init.d script (make sure it restarts on quit)
 * Maybe do pairing?
 * real notification (app?)
 * webserver
 * Fix wireless problems
 * Disable/Enable from webserver
 * Schedule
 */

'use strict';

var start = Date.now();
var safe = require('safety-dance');

function currentTime()
{
    return Date.now() - start;
}

var Mixer = require('./Mixer');
var mixer = new Mixer();

var open = __dirname + "/data/open.mp3";
var close = __dirname + "/data/close.mp3";

var openzwave = require('openzwave-shared');
var instance = new openzwave();
instance.connect("/dev/ttyACM0");
var timer;
var closed;
instance.on("node event", function(nodeId, value) {
    console.log(currentTime(), "GOT EVENT", value);
    if (timer)
        clearTimeout(timer);
    timer = setTimeout(function() {
        switch (value) {
        case 255:
            if (closed == undefined || closed) {
                closed = false;
                console.log(currentTime(), "STARTING PLAYBACK", closed);
                mixer.play(open);
            }
            break;
        case 0:
            if (!closed) {
                closed = true;
                console.log(currentTime(), "STARTING PLAYBACK", closed);
                mixer.play(close);
            }
            break;
        default:
            console.error(currentTime(), "Unhandled value", value);
            break;
        }
    }, 100);
});
