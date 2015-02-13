var socketio = require('socket.io')
var Bacon    = require('baconjs')

module.exports.add_channel = function(channel, http) {
  var io = socketio(http);

  var broadcast = new Bacon.Bus();

  io.on('connection', function(socket) {
    socket.on(channel, function(msg) {
      broadcast.push(msg);
    });
  });

  broadcast.onValue(function(msg) {
    console.log('broadcasting', msg);
    io.emit(channel, msg);
  });

  return { 'http': http,
           'broadcast': broadcast };
}
