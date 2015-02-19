function rest(action, message) {
  return {
    'action': action,
    'params': message
  };
}

function params(message, key) {
  return message.params[key];
}

function make_message(content) {
  return { 'content' : content };
}

var socket = io();
var channel = 'message';

$('form').submit(function(){
  var text = $('#m').val();
  $('#m').val('');

  socket.emit(channel, rest('create', make_message(text)));

  return false;
});

socket.on(channel, function(message){
  var msg = params(message, 'content');

  $('#messages').append($('<li>').text(msg));
});

socket.emit(channel, rest('index', {});
