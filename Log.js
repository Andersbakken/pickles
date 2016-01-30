/*global module */

var start = Date.now();
function currentTime() { return Date.now() - start; }
function log()
{
    var args = [ currentTime() ];
    for (var i=0; i<arguments.length; ++i) {
        args.push(arguments[i]);
    }
    console.log.apply(console, args);
}

function error()
{
    var args = [ currentTime() ];
    for (var i=0; i<arguments.length; ++i) {
        args.push(arguments[i]);
    }
    console.error.apply(console, args);
}


module.exports = {
    log: log,
    error: error
};
