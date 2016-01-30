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
var bodyParser = require('body-parser');
var app = express();

app.use('/js', express.static('./data/js'));
app.use('/css', express.static('./data/css'));
app.use('/fonts', express.static('./data/fonts'));
app.use(bodyParser.urlencoded({ extended: true }));

var appData = safe.JSON.parse(safe.fs.readFileSync(__dirname + "/data.json", "utf-8")) || {};
log("APPDATA", __dirname, appData);

console.log(safe.fs.readFileSync(__dirname + "/data.json", "utf-8"));
var openzwave;
var instance;

if (process.argv[2] != '--no-zwave') {
    openzwave = require('openzwave-shared');
    instance = new openzwave();
    instance.connect(appData.device);
    var timer;
    var closed;

    instance.on("node event", function(nodeId, value) {
        log("GOT EVENT", value);
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function() {
            function sendNotification() {
                var match = /([0-9][0-9]?):([0-9][0-9])-([0-9][0-9]?):([0-9][0-9])/.exec(appData.active);
                if (match) {
                    var d = new Date();
                    var hour =  d.getHours();
                    var min = d.getMinutes();
                    var val = (hour * 60) + min;
                    var startVal = (parseInt(match[1]) * 60) + parseInt(match[2]);
                    var endVal = (parseInt(match[3]) * 60) + parseInt(match[4]);
                    if (startVal > endVal)
                        endVal += (24 * 60);
                    if (val < startVal || val >= endVal) {
                        log("event outside of active window",  appData.active, d, hour, min, val, startVal, endVal);
                        return;
                    }
                }
                appData.userKeys.split("\r\n").forEach(function(userKey) {
                    log("sending to", userKey);
                    Pushover.send({ applicationToken: appData.applicationToken,
                                    userKey: userKey,
                                    title: closed ? appData.closeMessage : appData.openMessage,
                                    message: (closed ? appData.closeMessage : appData.openMessage) + " " + new Date() });
                });
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

function loadHtml(file) {
    var data = safe.fs.readFileSync(__dirname + file, { encoding: 'utf-8' });
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
    res.send(loadHtml("/data/index.html"));
});

app.get('/configure', function(req, res) {
    log(req);
    appData.host = req.headers.host;
    instance.disconnect();
    res.send(loadHtml("/data/redirect.html"));
    delete appData.host;
});

app.post('/update', function(req, res) {
    for (let key in req.body) {
        appData[key] = req.body[key];
    }
    safe.fs.writeFileSync(__dirname + "/data.json", JSON.stringify(appData, undefined, 4));
    res.send(loadHtml("/data/reboot.html"));
    var exec = require('child_process').exec;
    setTimeout(function() {
        exec('shutdown -r now');
        setTimeout(function() {
            exec('shutdown -r now');
        }, 5000);
    }, 5000);

});

app.listen(80, function () {
    console.log('Example app listening on port 80!');
});
