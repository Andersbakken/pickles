/*global require, module */

var fs = require('fs');
var lame = require('lame');
var Speaker = require('speaker');
var assert = require('assert');

var start = Date.now();

function currentTime()
{
    return Date.now() - start;
}

// function play(file, finished)
// {
//     fs.createReadStream(file)
//         .pipe(new lame.Decoder())
//     .on('format', function (format) {
//         var speaker = new Speaker(format);
//         speaker.on("close", function() {
//             console.log(currentTime(), "got close");
//             finished();
//         });
//         this.pipe(speaker);
//     });
// }

function Mixer()
{
    this.queue = [];
    this.playing = undefined;
    this.speaker = undefined;
    this.format = undefined;
}

Mixer.prototype.play = function(file, callback) {
    console.log(currentTime(), "play called", file, this.playing);
    var that = this;
    this.queue.push({ file: file, callback: callback });
    if (!this.playing)
        this._playNext();
};

Mixer.prototype._playNext = function() {
    assert(!this.playing);
    assert(this.queue.length > 0);
    this.playing = this.queue.splice(0, 1)[0];
    console.log(currentTime(), "starting playback of", this.playing.file);
    var that = this;
    fs.createReadStream(this.playing.file)
        .pipe(new lame.Decoder())
        .on('format', function(format) {
            console.log(currentTime(), "loaded format", file.file);
            if (!that.speaker) {
                that.format = format;
                that.speaker = new Speaker(format);
                speaker.on("close", function() {
                    var file = that.playing.file;
                    console.log(currentTime(), "playback of", file, "finished, queue length", that.queue.length);
                    var cb = that.playing.callback;
                    that.playing = undefined;
                    if (that.queue.length > 0)
                        that._playNext();
                    if (cb)
                        cb(file);
                });
            }
            assert(format == that.format);
            this.pipe(speaker);
        });
};

module.exports = Mixer;
