function rest(action, message) {
  return {
    'action': action,
    'params': message
  };
}

function make_message(content) {
  return { 'content' : content };
}

var Bacon   = require('baconjs')
var express = require('express');
var app     = express();
var http    = require('http').Server(app);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

bacon_http = require('./routes/restful-socket').add_channel('message', http);
http = bacon_http.http;

to_database = bacon_http.broadcast;
var broadcast_messages = new Bacon.Bus();

broadcast_messages.plug(to_database);
var changes_to_database = to_database.map(function(message) {
  message.test = 'hi';
  return message;
});

// TODO: debug output
broadcast_messages.onValue(function(msg) {console.log("broadcasting:", msg)});
//mapped_to_database.onValue(function(msg) {console.log("to database:", msg)});

// TODO: for testing
//var test_msg = rest('create', make_message('testing, 1, 2, 3!'))
//setTimeout(function() { broadcast_messages.push(test_msg) }, 5000);

http.listen(3000, function() {
    console.log('listening on *:3000');
});

