function curry(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(this, args.concat(
          Array.prototype.slice.call(arguments, 0)));
  };
};

function message_handler(message, buses) {
  console.log('received:', message);
  var msg = message.args;
  buses[message.action](msg);
}

function make_update_message(id, x, y) {
  return { action: "update", args: [{ id: id }, { x: x, y: y }] }
}

function create_node(jsPlumb,
                    mainContainer,
                    node_settings,
                    update_bus,
                    node_message) {

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

  var endpointOptions = {
    paintStyle:{ width:25, height:25, fillStyle:'#666' },
    isSource:true,
    connectorStyle : { strokeStyle:"#666", lineWidth: 5 },
    isTarget:true,
    maxConnections: -1,
    beforeDrop: function(e) { update_bus.push({
      action: "create",
      args:   [ { type: "edge", source_id: e.sourceId, target_id: targetId } ]
    }); }
  };
  var endpoint = jsPlumb.addEndpoint(e, {anchor: "Center"}, endpointOptions);

  return e;
}

function read_nodes(jsPlumb, mainContainer, node_settings, update_bus, node_messages) {
  $("." + node_settings.css_class).remove();

  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    create_node(jsPlumb, mainContainer, node_settings, update_bus, message);
  }
}

function update_node(jsPlumb, mainContainer, node_settings, node_message) {
  var id = node_message.id;

  var x = node_message.x;
  var y = node_message.y;

  var e = $("#" + node_settings.id_prefix + id);
  e.css({ "top": y, "left": x });
}

function delete_node(jsPlumb, mainContainer, node_settings, node_message) {
  var id = node_message.id;

  var e = $("#" + node_settings.id_prefix + id);
  e.remove();
}

function delete_nodes(jsPlumb, mainContainer, node_settings, node_messages) {
  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    delete_node(jsPlumb, mainContainer, node_settings, message);
  }
}

function update_nodes(jsPlumb, mainContainer, node_settings, node_messages) {
  for (var i = 0; i < node_messages.length; i++) {
    var message = node_messages[i];
    update_node(jsPlumb, mainContainer, node_settings, message);
  }
}

function center_click(node_settings, message) {
  return {
    x: message.x - (node_settings.width/2),
    y: message.y - (node_settings.height/2)
  }
}

function set_type_to_node(message) {
  message.type = "node";
  return message;
}

function toMessage(e) {
  var e = e[0];
  var parentOffset = $("#diagramContainer").offset();
  var relX = e.originalEvent.pageX - (parentOffset.left);
  var relY = e.originalEvent.pageY - Math.floor(parentOffset.top);
  return { x: relX, y: relY };
};

function find_element(position, message) {
  return $(document.elementFromPoint(position.x, position.y));
};

function get_id(message) {
  return message.attr("id").split("-")[1];
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

  var socket = io();
  var channel = 'message';

  var update_bus = new Bacon.Bus();
  update_bus.onValue(function(message) {
    socket.emit(channel, message);
  });

  var keydown = new Bacon.Bus();
  $(document).keydown(function(e) {
    keydown.push(e);
  });

  var mouse_position_events = new Bacon.Bus();
  $(document).mousemove(function(event) {
    mouse_position_events.push({ x: event.pageX, y: event.pageY });
  });

  var mouse_position = mouse_position_events.toProperty({ x: 0, y:0 }, function(x) { return x; });

  var d_down = keydown.filter(function(message) {
    return message.key == "d";
  });

  mouse_position.sampledBy(d_down, find_element)
        .map(get_id)
        .filter(function(message) { return message != undefined })
        .onValue(function(id) {
          socket.emit(channel, {action: 'destroy', args: [{ id: id }]});
        }
  );

  var clicked = Bacon.fromEventTarget($("#" + mainContainer), "click");

  clicked.bufferWithTimeOrCount(200, 2)
      .filter(function(x) { return x.length == 2 })
      .map(toMessage)
      .map(center_click, node_settings)
      .map(set_type_to_node)
      .onValue(function(message) {
    socket.emit(channel, { action: "create", args: [message] });
  });

  var node_buses = {
    create:  curry(create_node, jsPlumb, mainContainer, node_settings, update_bus),
    find:    curry(read_nodes, jsPlumb, mainContainer, node_settings, update_bus),
    update:  curry(update_nodes, jsPlumb, mainContainer, node_settings),
    destroy: curry(delete_nodes, jsPlumb, mainContainer, node_settings)
  };

  socket.on(channel, function(message) {
    message_handler(message, node_buses);
  });

  var initial_request = {
    action: 'find',
    args: {}
  }
  socket.emit(channel, initial_request);

});
