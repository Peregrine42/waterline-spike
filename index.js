function rest(action, message) {
  return {
    'action': action,
    'params': message
  };
}

function make_message(content) {
  return { 'content' : content };
}

var express  = require('express');
var app      = express();
var http     = require('http').Server(app);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

bacon_http = require('./routes/restful-socket').add_channel('message', http);
http = bacon_http.http;
broadcast_messages = bacon_http.broadcast;

//var test_msg = rest('create', make_message('testing, 1, 2, 3!'))
//setTimeout(function() { broadcast_messages.push(test_msg) }, 5000);

http.listen(3000, function() {
    console.log('listening on *:3000');
});

