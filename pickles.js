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

var safe = require('safetydance');
var Pushover = require('./Pushover');
var log = require('./Log').log;
var error = require('./Log').error;
var express = require('express');
var assert = require('assert');
var app = express();

var appData = safe.JSON.parse(safe.fs.readFileSync(__dirname + "/data.json")) || {};
if (!appData.title)
    appData.title = "Brage-varsel";
if (!appData.openMessage)
    appData.openMessage = "Døren ble åpnet";
if (!appData.closeMessage)
    appData.closeMessage = "Døren ble lukked";
log("APPDATA", appData);

var openzwave;
var instance;

if (process.argv[2] != '--no-zwave') {
    openzwave = require('openzwave-shared');
    instance = new openzwave();
    instance.connect("/dev/ttyACM0");
    var timer;
    var closed;

    instance.on("node event", function(nodeId, value) {
        log("GOT EVENT", value);
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function() {
            function sendNotification() {
                if (appData.applicationToken && appData.userKeys instanceof Array && appData.userKeys.length) {
                    appData.userKeys.forEach(function(userKey) {
                        Pushover.send({ applicationToken: appData.applicationToken,
                                        userKey: userKey,
                                        title: appData.openMessage,
                                        message: appData.closeMessage + " " + new Date() });
                    });
                }
            }
            switch (value) {
            case 255:
                if (closed == undefined || closed) {
                    closed = false;
                    log("Door was opened");
                    sendNotification();
                }
                break;
            case 0:
                if (!closed) {
                    closed = true;
                    log("Door was closed");
                    sendNotification();
                }
                break;
            default:
                error("Unhandled value", value);
                break;
            }
        }, 100);
    });
}

function loadHtml() {
    var data = safe.fs.readFileSync(__dirname + "/data/index.html", { encoding: 'utf-8' });
    assert(data);
    for (var key in appData) {
        var k = '%';
        for (let i=0; i<key.length; ++i) {
            k += key[i].toUpperCase();
        }
        k += '%';
        var value = appData[key] || "";
        if (value instanceof Array)
            value = value.join('\n');
        data = data.replace(new RegExp(k, 'g'), value);
    }
    return data;
}
app.get('/', function(req, res) {
    res.send(loadHtml());
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
