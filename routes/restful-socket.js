var socketio = require('socket.io')
module.exports.add_channel = function(channel, http) {
  var io = socketio(http);

  io.on('connection', function(socket) {
    socket.on(channel, function(msg) {
      io.emit(channel, msg);
    });
  });

  return http;
}
