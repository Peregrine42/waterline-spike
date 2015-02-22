var socketio = require('socket.io')
var Bacon    = require('baconjs')

function baconify(channel, socket) {
  var bus = new Bacon.Bus();
  bus.onValue(function(message) {
    socket.emit(channel, message);
  });
  return bus;
}

module.exports.add_channel = function(channel,
                                      http) {
  var io = socketio(http);

  var connections = Bacon.fromBinder(function(sink) {
    io.on('connection', sink);
  });

  var messages = connections.flatMap(function(socket) {
    return Bacon.fromBinder(function(sink) {
      socket.on('message', function(txt) {
        sink({ author: baconify(channel, socket), content: txt });
      });
    });
  });

  var broadcast = baconify(channel, io);

  return { http      : http,
           messages  : messages,
           broadcast : broadcast }
}
