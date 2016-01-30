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

var appData = safe.JSON.parse(safe.fs.readFileSync(__dirname + "/data.json")) || {};
log("APPDATA", appData);
if (!appData.title)
    appData.title = "Brage-varsel";
if (!appData.openMessage)
    appData.openMessage = "Døren ble åpnet";
if (!appData.closeMessage)
    appData.closeMessage = "Døren ble lukked";

var openzwave = require('openzwave-shared');
var instance = new openzwave();
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
