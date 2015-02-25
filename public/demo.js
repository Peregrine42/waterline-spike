function message_handler(message, buses) {
  console.log('received:', message);
  var msg = message.args;
  buses[message.action].push(msg);
}

function make_update_message(id, x, y) {
  return { action: "update", args: [{ id: id }, { x: x, y: y }] }
}

function createNode(jsPlumb,
                    mainContainer,
                    node_message,
                    node_settings,
                    update_bus) {

  var id = node_message.id;
  var x = node_message.x;
  var y = node_message.y;

  var e = $('<div></div>');
  $("#" + mainContainer).append(e);
  e.attr("id", node_settings.id_prefix + id);
  e.addClass(node_settings.css_class);
  e.css({
    "top": y,
    "left": x,
    "width": node_settings.width,
    "height": node_settings.height
  });

  jsPlumb.draggable(e, { containment: "parent", stop: function(e) {
      var new_x = e.pos[0];
      var new_y = e.pos[1];
      update_bus.push(make_update_message(id, new_x, new_y));
    }
  });

  return e;
}

function readNodes(jsPlumb, mainContainer, node_messages, node_settings, update_bus) {
  $("." + node_settings.css_class).remove();

  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    createNode(jsPlumb, mainContainer, message, node_settings, update_bus);
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
  console.log(node_message);

  var e = $("#" + node_settings.id_prefix + id);
  e.remove();
}

function deleteNodes(jsPlumb, mainContainer, node_messages, node_settings) {
  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    deleteNode(jsPlumb, mainContainer, message, node_settings);
  }
}

function updateNodes(jsPlumb, mainContainer, node_messages, node_settings) {
  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    updateNode(jsPlumb, mainContainer, message, node_settings);
  }
}

function center_click(node_settings, message) {
  return {
    x: message.x - (node_settings.width/2),
    y: message.y - (node_settings.height/2)
  }
}

function toMessage(e) {
  var e = e[0];
  console.log("message: ", e);
  var parentOffset = $("#diagramContainer").offset();
  var relX = e.originalEvent.pageX - (parentOffset.left);
  var relY = e.originalEvent.pageY - Math.floor(parentOffset.top);
  //console.log(relX);
  //console.log(relY);
  return { x: relX, y: relY };
};

jsPlumb.ready(function() {
  var mainContainer = "diagramContainer";

  var node_settings = {
    "id_prefix": "node-",
    "css_class": "node",
    "width"    : 75,
    "height"   : 75
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

  var update_bus = new Bacon.Bus();
  update_bus.onValue(function(message) {
    socket.emit(channel, message);
  });

  var clicked = Bacon.fromEventTarget($("#" + mainContainer), "click");

  clicked.bufferWithTimeOrCount(200, 2)
      .filter(function(x) { return x.length == 2 })
      .map(toMessage)
      .map(center_click, node_settings)
      .onValue(function(message) {
    socket.emit(channel, { action: "create", args: [message] });
  });

  node_buses.create.onValue(function(message) {
    createNode(jsPlumb, mainContainer, message, node_settings, update_bus);
  });
  node_buses.find.onValue(function(message) {
    readNodes(jsPlumb, mainContainer, message, node_settings, update_bus);
  });
  node_buses.update.onValue(function(message) {
    updateNodes(jsPlumb, mainContainer, message, node_settings);
  });
  node_buses.destroy.onValue(function(message) {
    deleteNodes(jsPlumb, mainContainer, message, node_settings);
  });

  socket.on(channel, function(message) {
    message_handler(message, node_buses);
  });

  var initial_request = {
    action: 'find',
    args: {}
  }
  socket.emit(channel, initial_request);

});
