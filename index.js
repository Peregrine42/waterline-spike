var Waterline = require('waterline');
var model     = require('./models/message');
var database_write_responses = model.changes;
var Message   = model.Message;
var Bacon   = require('baconjs')
var express = require('express');
var _       = require('underscore');
var app     = express();
var http    = require('http').Server(app);

function curry(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(this, args.concat(
          Array.prototype.slice.call(arguments, 0)));
  };
};

function handleCreate(message, bus) {
  app.models.message.create(message).exec(function(err, response) {
    var restful_r = rest('create', response);
    bus.push(restful_r);
  });
}

function handleIndex(message, bus) {
  app.models.message.find({}, function(err, response) {
    _.each(response, function(r) {
      var restful_r = rest('create', r);
      bus.push(restful_r);
    });
  });
}

function handleUpdate(message, bus) {
  app.models.message.update(message.criteria, message.values, function(err, response) {
    _.each(response, function(r) {
      var restful_r = rest('update', r);
      bus.push(restful_r);
    });
  });
}

function handleDestroy(message, bus) {
  app.models.message.destroy(message.criteria, function(err, response) {
    _.each(response, function(r) {
      var restful_r = rest('destroy', r);
      console.log(restful_r);
      bus.push(restful_r);
    });
  });
}

var create_message = function(message, upstream_bus, downstream_bus) {
  return handleCreate(message, downstream_bus);
};

var index_message = function(message, upstream_bus, downstream_bus) {
  return handleIndex(message, upstream_bus);
};

var update_message = function(message, upstream_bus, downstream_bus) {
  return handleUpdate(message, downstream_bus);
};

var destroy_message = function(message, upstream_bus, downstream_bus) {
  return handleDestroy(message, downstream_bus);
};

function activateController(
                            controller,
                            downstream_bus,
                            message,
                            upstream_bus
                           ) {
  //var action = message.action;

  //console.log('begin', action);
  //console.log('message', message);
  //console.log('upstream bus', upstream_bus);
  //console.log('downbus', downstream_bus);
  //console.log('controller', controller);
  controller[message.action](message.params, upstream_bus, downstream_bus);
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
    migrate: 'drop'
  }
};

var orm = new Waterline();
orm.loadCollection(Message);

app = require('./routes/root').modify(app);
app = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));


var outgoing_broadcast   = baconified.outgoing_broadcast
//outgoing_broadcast.foo = 'downstream';
var incoming_from_client = baconified.incoming_messages
var incoming_connections = baconified.incoming_connections

var controller = {
  create:  create_message,
  index:   index_message,
  update:  update_message,
  destroy: destroy_message
}

//var messageController = curry(activateController, outgoing_broadcast);
var mainController     = curry(activateController, controller, outgoing_broadcast);

var main_message_queue = Bacon.zipAsArray([incoming_from_client,
                                           incoming_connections])
                              .onValues(mainController);

//var changes_to_database = to_database.map(function(message) {
//message.test = 'hi';
//return message;
//});

// TODO: debug output
outgoing_broadcast.onValue(function(msg) {console.log("broadcasting:", msg)});
//incoming_from_client.onValue(function(msg) {console.log("incoming_from_client:", msg)});
//incoming_connections.onValue(function(msg) {console.log("incoming_connections:", msg)});
//mapped_to_database.onValue(function(msg) {console.log("to database:", msg)});

function send_to_socket(message) {
  socket = message.socket;
  content = message.content;

  socket.push(content);
}

function read_only(action) {
  if (action == 'get') {
    return true;
  } else {
    return false;
  }
}

function asArray(first, second) {
  return [first, second];
}

function add_to_array(contents, new_item) {
  return contents.concat(new_item)
}

function remove_from_array(contents, removed_item) {
  return _.remove(contents, removed_item)
}

function with_clients(response) {
  return Bacon.fromArray(current_clients);
}

//controller = {
  //'get':  message_get,
  //'post': message_post,
  //'delete': message_delete
//}


function send_to_database(message) {
  var action = message.action;

  var params = message.params;

  var db_response_handler = function(err, response) {
    database_responses.push({ action: action, params: response })
  }

  params.push(db_response_handler);
  app.models.message[action].apply(params);
}

//{
  //author: socket,
  //content: {
             //action: 'create',
             //params: []
           //}
//}

var baconified = require('./routes/restful-socket').add_channel('message', http);
http = baconified.http;

var messages              = baconified.messages; // socket, message pairs
var connecting_clients    = baconified.clients;  // buses to each client
var disconnecting_clients = baconified.disconnecting_clients; // buses to each disconnecting client

var current_clients = Bacon.update([],
    connecting_clients, add_to_array,
    disconnecting_clients, remove_from_array);

//var incoming_database_changes = messages.map('.content');

//var database_responses       = new Bacon.Bus();
//var database_read_responses  = database_responses.filter(read_only);
//var database_write_responses = database_responses.reject(read_only);
//var incoming_read_sockets    = messages.filter(read_only).map('.author');
//var outgoing_read_responses  = Bacon.zipAsArray(database_read_responses,
                                                //incoming_read_sockets)
                                    //.map(function(array) {return {author: array[1], content: array[0]}})

//var outgoing_writes = database_write_responses.flatMap(with_clients);

//incoming_database_changes.onValue(send_to_database);
//outgoing_read_responses.onValue(send_to_socket);
//outgoing_writes.onValue(send_to_socket);

var read_commands_for_db  = messages.filter(read_only_messages).map('.content');
var write_commands_for_db = messages.reject(read_only_messages).map('.content');

read_commands_for_db.onValue(read_from_database);
write_commands_for_db.onValue(write_to_database);

// create a stream of read responses from db, paired with the correct socket
// create a stream of write responses from db, paired with an array of sockets

read_responses.onValue(send_back_to_socket);
write_reponses.onValue(broadcast);

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
