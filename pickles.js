#!/usr/bin/env node
/*global require, __dirname, clearTimeout, setTimeout, process */

'use strict';

var start = Date.now();

function currentTime()
{
    return Date.now() - start;
}

var Mixer = require('./Mixer');
var mixer = new Mixer();

var open = __dirname + "/data/open.mp3";
var close = __dirname + "/data/close.mp3";

// setTimeout(function() {
//     mixer.play(open, function() {
//         mixer.play(close, function() {
//             process.exit();
//         });
//     });
//     mixer.play(open);
// }, 1000);

var openzwave = require('openzwave-shared');
var instance = new openzwave();
instance.connect("/dev/ttyACM0");
var lastValue;
var timer;
instance.on("node event", function(nodeId, value) {
    console.log(currentTime(), "GOT EVENT", value);
    if (timer)
        clearTimeout(timer);
    lastValue = value;
    timer = setTimeout(function() {
        console.log(currentTime(), "STARTING PLAYBACK", lastValue);
        switch (lastValue) {
        case 255:
            mixer.play(open);
            break;
        case 0:
            mixer.play(close);
            break;
        default:
            console.error(currentTime(), "Unhandled value", value);
            break;
        }
    }, 100);
});
