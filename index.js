var Waterline = require('waterline');
var Message = require('./models/message');
var Bacon   = require('baconjs')
var express = require('express');
var _       = require('underscore');
var app     = express();
var http    = require('http').Server(app);

function pack() {
  var args = [].slice.call(arguments);
  var last = args.pop();

  return last.push.apply(args);
};

function curry(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(this, args.concat(
          Array.prototype.slice.call(arguments, 0)));
  };
};

function handleIndex(message, bus) {
  app.models.message.find({}, function(err, response) {
    _.each(response, function(r) {
      var restful_r = { action: 'create', params: r }
      bus.push(restful_r);
    });

  });
}
var index_message = function(message, upstream_bus, downstream_bus) {
  return handleIndex(message, upstream_bus);
};

function handleCreate(message, bus) {
  console.log('at create');
  app.models.message.create(message).exec(function(err, response) {
    console.log('response from database', response);
    var restful_r = { action: 'create', params: response };
    //console.log('outbound bus foo', bus['foo']);
    bus.push(restful_r);
  });
}
var create_message = function(message, upstream_bus, downstream_bus) {
  return handleCreate(message, downstream_bus);
};

function activateController(downstream_bus,
                            controller,
                            message,
                            upstream_bus) {
  var action = message.action;

  console.log('begin', action);
  console.log('message', message);
  console.log('upstream bus', upstream_bus);
  console.log('downbus', downstream_bus);
  //console.log('controller', controller);
  controller[action](message.params, upstream_bus, downstream_bus);
}

function rest(action, message) {
  return {
    'action': action,
    'params': message
  };
}

function make_message(content) {
  return { 'content' : content };
}

var diskAdapter = require('sails-disk')

var config = {
  // Setup Adapters
  // Creates named adapters that have have been required
  adapters: {
    'default': diskAdapter,
    disk: diskAdapter
  },
  // Build Connections Config
  // Setup connections using the named adapter configs
  connections: {
    myLocalDisk: {
      adapter: 'disk'
    },
  },
  defaults: {
    migrate: 'safe'
  }
};

var orm = new Waterline();
orm.loadCollection(Message);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

baconified = require('./routes/restful-socket').add_channel('message', http);
http = baconified.http;

var outgoing_broadcast   = baconified.outgoing_broadcast
outgoing_broadcast.foo = 'downstream';
var incoming_from_client = baconified.incoming_messages
var incoming_connections = baconified.incoming_connections

var controller = {
  index: index_message,
  create: create_message
}

var messageController = curry(activateController, outgoing_broadcast);
var mainController    = curry(messageController, controller);

var main_message_queue = Bacon.zipAsArray([incoming_from_client,
                                           incoming_connections])
                              .onValues(mainController);

//var changes_to_database = to_database.map(function(message) {
//message.test = 'hi';
//return message;
//});

// TODO: debug output
outgoing_broadcast.onValue(function(msg) {console.log("broadcasting:", msg)});
incoming_from_client.onValue(function(msg) {console.log("incoming_from_client:", msg)});
incoming_connections.onValue(function(msg) {console.log("incoming_connections:", msg)});
//mapped_to_database.onValue(function(msg) {console.log("to database:", msg)});

// TODO: for testing
//setTimeout(function() { }, 5000);

orm.initialize(config, function(err, models) {
  if(err) throw err;
  app.models      = models.collections;
  app.connections = models.connections;

  // start server
  http.listen(3000, function() {
    console.log('listening on *:3000');
  });
});
