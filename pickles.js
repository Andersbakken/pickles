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
var exec = require('child_process').exec;
var fs = require('fs');
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

function reboot()
{
    exec('shutdown -r now');
}

var logFile = "/var/log/pickles-notifications.log";
(function()
 {
    try {
        var lines = safe.fs.readFileSync(logFile, "utf-8").split('\n');
        if (lines && lines.length > 100000) {
            lines.splice(0, lines.length - 100000);
            safe.fs.writeFileSync(logFile, lines.join("\n"));
        }
    } catch (err) {
    }
})();

function addLog(str)
{
    try {
        fs.appendFile(logFile, str + "\n");
    } catch (err) {
        error("Couldn't append to file: " + err.toString());
    }
}

if (process.argv[2] != '--no-zwave') {
    openzwave = require('openzwave-shared');
    instance = new openzwave();
    instance.connect(appData.device);
    var timer;
    var closed;

    var id = setTimeout(reboot, 15000);
    instance.on("driver ready", function() {
        if (id) {
            clearTimeout(id);
            id = undefined;
        }
    });

    instance.on("node event", function(nodeId, value) {
        log("GOT EVENT", value);
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function() {
            function sendNotification() {
                if (closed) {
                    addLog(new Date() + " door was closed");
                } else {
                    addLog(new Date() + " door was opened");
                }
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

var htmlHost;
function loadHtml(file) {
    var data = safe.fs.readFileSync(__dirname + file, { encoding: 'utf-8' });
    assert(data);
    if (htmlHost)
        appData.host = htmlHost;
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
    delete appData.htmlHost;
    return data;
}

var rebooting = false;
app.get('/', function(req, res) {
    htmlHost = req.headers.host;
    if (rebooting) {
        res.send(loadHtml("/data/reboot.html"));
        reboot();
        setTimeout(function() { reboot(); }, 5000);
    } else {
        res.send(loadHtml("/data/index.html"));
    }
});

app.get('/log', function(req, res) {
    htmlHost = req.headers.host;
    res.type('text/plain');
    res.send(safe.fs.readFileSync("/var/log/pickles.log"));
});
app.get('/error', function(req, res) {
    htmlHost = req.headers.host;
    res.type('text/plain');
    res.send(safe.fs.readFileSync("/var/log/pickles.err"));
});
app.get('/notifications', function(req, res) {
    htmlHost = req.headers.host;
    res.type('text/plain');
    res.send(safe.fs.readFileSync(logFile));
});

app.get('/configure', function(req, res) {
    htmlHost = req.headers.host;
    instance.disconnect();
    res.send(loadHtml("/data/redirect.html"));
});

app.post('/update', function(req, res) {
    htmlHost = req.headers.host;
    for (let key in req.body) {
        appData[key] = req.body[key];
    }
    var contents = safe.fs.readFileSync("/etc/wpa_supplicant/wpa_supplicant.conf");
    if (contents)
        safe.fs.writeFileSync("/etc/wpa_supplicant/wpa_supplicant.conf.bak");

    var newContents = ('ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n' +
                       'update_config=1\n' +
                       '\n' +
                       'network={\n' +
                       '\tssid="' + appData.ssid + '"\n' +
                       '\tpsk="' + appData.wifiPassword + '"\n' +
                       '}\n');
    safe.fs.writeFileSync("/etc/wpa_supplicant/wpa_supplicant.conf", newContents);

    safe.fs.writeFileSync(__dirname + "/data.json", JSON.stringify(appData, undefined, 4));
    rebooting = true;
    res.redirect("/");
});

app.listen(80, function () {
    console.log('Example app listening on port 80!');
});

/*
var events = [
    "Type_ValueAdded",
    "Type_ValueRemoved",
    "Type_ValueChanged",
    "Type_ValueRefreshed",
    "Type_Group",
    "Type_NodeNew",
    "Type_NodeAdded",
    "Type_NodeRemoved",
    "Type_NodeProtocolInfo",
    "Type_NodeNaming",
    "Type_NodeEvent",
    "Type_PollingDisabled",
    "Type_PollingEnabled",
    "Type_SceneEvent",
    "Type_CreateButton",
    "Type_DeleteButton",
    "Type_ButtonOn",
    "Type_ButtonOff",
    "Type_DriverReady",
    "Type_DriverFailed",
    "Type_DriverReset",
    "Type_EssentialNodeQueriesComplete",
    "Type_NodeQueriesComplete",
    "Type_AwakeNodesQueried",
    "Type_AllNodesQueriedSomeDead",
    "Type_AllNodesQueried",
    "Type_Notification",
    "Type_DriverRemoved",
    "Type_ControllerCommand",
    "Type_NodeReset"
];

events.forEach(function(ev) {
    var name = ev[5].toLowerCase();
    for (var i=6; i<ev.length; ++i) {
        if (ev[i] == ev[i].toUpperCase()) {
            name += ' ' + ev[i].toLowerCase();
        } else {
            name += ev[i];
        }
    }
    instance.on(name, function() {
        log('LOG GOT EVENT', name, arguments);
    });
    // console.log(ev, name);
});
*/
