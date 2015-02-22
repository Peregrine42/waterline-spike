Error.stackTraceLimit = Infinity;

var Waterline = require('waterline');
var Message   = require('./models/message');
var Bacon   = require('baconjs')
var express = require('express');
var _       = require('underscore');
var app     = express();
var http    = require('http').Server(app);
var bacon_sockets = require('./routes/bacon-socket')

var diskAdapter = require('sails-disk')

var config = {
  adapters: {
    'default': diskAdapter,
    disk: diskAdapter
  },
  connections: {
    myLocalDisk: {
      adapter: 'disk'
    },
  },
  defaults: {
    migrate: 'drop'
  }
};

var orm = new Waterline();
orm.loadCollection(Message);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

var baconified = bacon_sockets.add_channel('message', http);
http = baconified.http;

var messages      = baconified.messages;
var broadcast_bus = baconified.broadcast;

function read_only_messages(message) {
  console.log('filtering message', message);
  if (message.content.action == 'find') {
    return true;
  };
  return false;
}

function database_request(message) {
  console.log('handling db request', message);
  var action = message.content.action;
  var args = message.content.args;
  console.log(args);
  return Bacon.fromBinder(function(sink) {
    var the_call = app.models.message[action];
    var bind_args = [];
    bind_args.push(the_call, app.models.message, args);
    console.log(_.bind);
    var func = _.bind.apply(bind_args);
    func(function(err, response) {
      sink({ author: message.author, content: { action: response} })
    });
  });
}

function send_to_author(message) {
  var bus = message.author;
  bus.push(message.content);
}

function set_author(message, new_author) {
  message.author = new_author;
  return message;
}

var read_commands_for_db  = messages.filter(read_only_messages);
var write_commands_for_db = messages.filter(read_only_messages).not()
                                    .map(set_author, broadcast_bus);

read_responses  = read_commands_for_db.flatMap(database_request);
write_responses = write_commands_for_db.flatMap(database_request);

read_responses.onValue(send_to_author);
write_responses.onValue(send_to_author);

orm.initialize(config, function(err, models) {
  if(err) throw err;
  app.models      = models.collections;
  app.connections = models.connections;

  // start server
  http.listen(3000, function() {
    console.log('listening on *:3000');
  });
});
