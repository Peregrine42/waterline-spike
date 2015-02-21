var socketio = require('socket.io')
var Bacon    = require('baconjs')

function baconify(channel, socket) {
  var bus = new Bacon.Bus();
  bus.onValue(socket.emit, channel);
  return bus;
}

module.exports.add_channel = function(
                                      channel,
                                      http,
                                      ) {
  var io = socketio(http);

  var connections = Bacon.fromBinder(function(sink) {
    io.on('connection', sink);
  });

  var disconnections = Bacon.fromBinder(function(sink) {
    io.on('disconnect', sink);
  });

  var clients = connections.map(channel, baconify);
  var disconnecting_clients = disconnections.map(channel, baconify);

  var messages = connections.flatMap(function(socket) {
    return Bacon.fromBinder(function(sink) {
      socket.on('message', function(txt) {
        sink({ author: baconify(channel, socket), txt: txt });
      });
    });
  });

  return { 'http'     : http,
           'messages' : messages,
           'clients'  : clients,
           'disconnecting_clients' : disconnecting_clients };
}
