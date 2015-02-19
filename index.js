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

var Waterline = require('waterline');
var Message = require('./models/message');
var orm = new Waterline();
orm.loadCollection(Message);

var Bacon   = require('baconjs')
var express = require('express');
var app     = express();
var http    = require('http').Server(app);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

bacon_http = require('./routes/restful-socket').add_channel('message', http);
http = bacon_http.http;

to_database = bacon_http.broadcast.map(function(message) {
  if (message.action == 'create') {
    app.models.message.create(message).exec(function(err, messages) {});
    console.log(app.models.message.find({}, function(err, messages) {console.log(messages)}));
    return message;
  } else if (message.action == 'index') {
    app.models.message.find({}, function(err, messages) {});
  }
});

var broadcast_messages = new Bacon.Bus();

broadcast_messages.plug(to_database);
//var changes_to_database = to_database.map(function(message) {
//message.test = 'hi';
//return message;
//});

// TODO: debug output
broadcast_messages.onValue(function(msg) {console.log("broadcasting:", msg)});
//mapped_to_database.onValue(function(msg) {console.log("to database:", msg)});

// TODO: for testing
//setTimeout(function() { }, 5000);

orm.initialize(config, function(err, models) {
  if(err) throw err;
  app.models = models.collections;
  app.connections = models.connections;
  // Start Server
  http.listen(3000, function() {
    console.log('listening on *:3000');
  });
});
