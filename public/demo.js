function message_handler(message, buses) {
  console.log('received:', message);
  var msg = message.args;
  buses[message.action].push(msg);
}

function createNode(jsPlumb, mainContainer, node_message, node_settings) {
  var id = node_message.id;
  var x = node_message.x;
  var y = node_message.y;

  var e = $('<div></div>');
  $("#" + mainContainer).append(e);
  e.attr("id", node_settings.id_prefix + id);
  e.addClass(node_settings.css_class);
  e.css({ "top": y, "left": x });

  jsPlumb.draggable(e, { containment: "parent" });

  return e;
}

function readNodes(jsPlumb, mainContainer, node_messages, node_settings) {
  $("." + node_settings.css_class).remove();

  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    createNode(jsPlumb, mainContainer, message, node_settings);
  }
}

function updateNode(jsPlumb, mainContainer, node_message, node_settings) {
  var id = node_message.id;

  var x = node_message.x;
  var y = node_message.y;

  var e = $("#" + node_settings.id_prefix + id);
  e.css({ "top": y, "left": x });
}

function deleteNode(jsPlumb, mainContainer, node_message, node_settings) {
  var id = node_message.id;

  var e = $("#" + node_settings.id_prefix + id);
  e.remove();
}

jsPlumb.ready(function() {
  var mainContainer = "diagramContainer";

  var node_settings = {
    "id_prefix": "node-",
    "css_class": "node"
  };

  jsPlumb.setContainer($(mainContainer));

  //var nodeMessage1 = { "x": 90, "y": 120, "id": 1 }
  //var nodeMessage2 = { "x": 500, "y": 50, "id": 2 }

  //createNode(jsPlumb, mainContainer, nodeMessage1, node_settings);
  //createNode(jsPlumb, mainContainer, nodeMessage2, node_settings);

  //var nodeMessage3 = { "x": 90, "y": 120, "id": 1 }
  //deleteNode(jsPlumb, mainContainer, nodeMessage3, node_settings);

  //var nodeMessage4 = { "x": 90, "y": 140, "id": 2 }
  //updateNode(jsPlumb, mainContainer, nodeMessage4, node_settings);

  //var messages = [ nodeMessage1, nodeMessage2 ];
  //readNodes(jsPlumb, mainContainer, messages, node_settings);

  var socket = io();
  var channel = 'message';

  var node_buses = {
    create:  new Bacon.Bus(),
    find:    new Bacon.Bus(),
    update:  new Bacon.Bus(),
    destroy: new Bacon.Bus()
  };

  node_buses.create.onValue(function(message) {
    createNode(jsPlumb, mainContainer, message, node_settings);
  });
  node_buses.find.onValue(function(message) {
    findNodes(jsPlumb, mainContainer, message, node_settings);
  });
  node_buses.update.onValue(function(message) {
    updateNode(jsPlumb, mainContainer, message, node_settings);
  });
  node_buses.destroy.onValue(function(message) {
    destroyNode(jsPlumb, mainContainer, message, node_settings);
  });

  socket.on(channel, function(message) {
    message_handler(message, node_buses);
  });

});
