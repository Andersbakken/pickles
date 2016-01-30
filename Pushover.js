/*global require, module */

var request = require('request');

// var applicationToken = "";
// var userKey = "";

module.exports.send = function(params) {
    var form = {
        token: params.applicationToken,
        user: params.userKey,
        message: params.message,
        title: params.title
    };

    request.post('https://api.pushover.net/1/messages.json', { form: form },
                 function (error, response, body) {
                     console.log(error, response, body);
                 });
};
