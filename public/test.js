function make_command(action, args) {
  return {
    'action': action,
    'args': args
  };
}

function params(message, key) {
  return message.params[key];
}

function make_message(content) {
  return { 'content' : { 'text': content } };
}

var socket = io();
var channel = 'message';

$('form').submit(function(){
  var text = $('#m').val();
  $('#m').val('');

  socket.emit(channel, make_command('create', [{ 'content': text }]));

  return false;
});

$('#deleter').click(function() {
  var id = $('ul li:last-child').attr('id');
  message = make_command('destroy', [{'id': id }])
  console.log(message);
  socket.emit(channel, message);
});

function append_message(message) {
  $('#messages').append($('<li id="' + message.id + '">').text(message.content));
  $('#'+ message.id).click(function() {
    socket.emit(channel, make_command('update', [{ 'id': message.id }, {'content':'foo'}]));
  });
}

socket.on(channel, function(message){
  console.log('received:', message);
  if (message.action == 'create') {
    var msg = message.args;
    append_message(msg);
  } else if (message.action == 'update') {
    var messages = message.args;
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      $('#'+ msg.id).text(msg.content);
    };
  } else if (message.action == 'destroy') {
    var messages = message.args;
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      $('#'+ msg.id).remove();
    };
  } else if (message.action == 'find') {
    var messages = message.args;
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      append_message(msg);
    };
  }
});

socket.emit(channel, make_command('find', [{}]));
