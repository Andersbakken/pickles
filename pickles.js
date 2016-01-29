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
    // instance.on(name, function() {
    //     console.log('LOG GOT EVENT', name, arguments);
    // });
    // console.log(ev, name);
});


// var zwave = require('./zwave');
// zwave.start("/dev/ttyACM0");
// console.log("STARTED");
