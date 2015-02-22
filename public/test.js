function message(action, args) {
  return {
    'action': action,
    'args': [args]
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

$('#deleter').click(function() {
  var id = $('ul li:last-child').attr('id');
  message = rest('destroy', {'criteria': {'id': id }})
  console.log(message);
  socket.emit(channel, message);
});

socket.on(channel, function(message){
  console.log('received:', message);
  if (message.action == 'create') {
    var msg = message.params.content;
    $('#messages').append($('<li id="' + message.params.id + '">').text(msg));
    $('#'+ message.params.id).click(function() {
      socket.emit(channel, rest('update', {'criteria': {'id':message.params.id}, 'values': {'content':'foo'}}));
    });
  } else if (message.action == 'update') {
    var msg = message.params.content;
    $('#'+ message.params.id).text(msg);
  } else if (message.action == 'destroy') {
    $('#'+ message.params.id).remove();
  }
});

socket.emit(channel, message('find', {}));
