var socketio = require('socket.io')
var Bacon    = require('baconjs')


module.exports.add_channel = function(channel, http) {
  var io = socketio(http);

  var broadcast            = new Bacon.Bus();
  var incoming_messages    = new Bacon.Bus();
  var incoming_connections = new Bacon.Bus();

  io.on('connection', function(socket) {
    socket.on(channel, function(msg) {
      var outgoing = new Bacon.Bus();
      outgoing.onValue(function(msg) {
        socket.emit(channel, msg);
      });
      incoming_connections.push(outgoing);

      incoming_messages.push(msg);
    });

    //socket.on('disconnect', function () {
    //});
  });

  broadcast.onValue(function(msg) {
    io.emit(channel, msg);
  });

  return { 'http': http,
           'outgoing_broadcast':   broadcast,
           'incoming_messages':    incoming_messages,
           'incoming_connections': incoming_connections,
         };
}
