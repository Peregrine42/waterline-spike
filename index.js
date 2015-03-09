var Waterline  = require('waterline');
var Message    = require('./models/message');
var GraphNode  = require('./models/graph_node');
var Connection = require('./models/connection');
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
orm.loadCollection(GraphNode);
orm.loadCollection(Connection);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);
app = require('./routes/demo').modify(app);

app.use(express.static(__dirname + '/public'));

var baconified = bacon_sockets.add_channel('message', http);
http = baconified.http;

var messages      = baconified.messages;
var broadcast_bus = baconified.broadcast;

function read_only_messages(message) {
  if (message.content.action === 'find') {
    return true;
  };
  return false;
}

function write_only_messages(message) {
  return !read_only_messages(message);
}

function database_request(message) {
  console.log('handling db request', message);
  return Bacon.fromBinder(function(sink) {
    var action = message.content.action;
    var args = message.content.args;
    var type = message.content.type;
    if (action == 'find') {
      app.models[type].find(args[0]).exec(function(err, response) {
        sink({ author: message.author, content: { type: type, action: 'find', args: response} });
      });
    } else if (action == 'create') {
      app.models[type].create(args[0]).exec(function(err, response) {
        sink({ author: message.author, content: { type: type, action: 'create', args: response} });
      });
    } else if (action == 'update') {
      app.models[type].update(args[0], args[1]).exec(function(err, response) {
        sink({ author: message.author, content: { type: type, action: 'update', args: response} });
      });
    } else if (action == 'destroy') {
      app.models[type].destroy(args[0]).exec(function(err, response) {
        sink({ author: message.author, content: { type: type, action: 'destroy', args: response} });
      });
    };
  });
}

function send_to_author(message) {
  console.log('sending out', message.content);
  var bus = message.author;
  bus.push(message.content);
}

function set_author(new_author, message) {
  message.author = new_author;
  return message;
}

var read_responses  = messages.filter(read_only_messages)
                              .flatMap(database_request);

var write_responses = messages.filter(write_only_messages)
                              .map(set_author, broadcast_bus)
                              .flatMap(database_request);

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
