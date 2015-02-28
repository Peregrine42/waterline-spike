var mainContainer = "diagramContainer";

jsPlumb.setContainer($("#" + mainContainer));

function curry(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(this, args.concat(
          Array.prototype.slice.call(arguments, 0)));
  };
};

function dup(obj)
{
  return JSON.parse(JSON.stringify(obj));
}

function message_handler(message, buses) {
  console.log('received:', message);
  var msg = message.args;
  buses[message.action](msg);
}

function make_update_message(id, x, y) {
  return { action: "update", args: [{ id: id }, { x: x, y: y }] }
}

function create_connection(jsPlumb,
                           settings,
                           message) {
  var e = jsPlumb.connect({ source: message.source_id,
                            target: message.target_id,
                          });
}


function create_node(env, node_message) {
  var jsPlumb       = env.jsPlumb;
  var node_settings = env.dom;
  var outgoing_bus  = env.outgoing_bus;

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

  var target = $('<div></div>');
  $("#" + node_settings.id_prefix + id).append(target);
  target.attr("id", node_settings.id_prefix + id + "_1");
  target.addClass(node_settings.css_class);
  target.css({
    "top": (node_settings.width/2) - 20,
    "left": (node_settings.width/2) - 20,
    "width": 40,
    "height": 40
  });

  jsPlumb.draggable(e, { containment: "parent", stop: function(e) {
      var new_x = e.pos[0];
      var new_y = e.pos[1];
      update_bus.push(make_update_message(id, new_x, new_y));
    }
  });

  var endpointOptions = {
    paintStyle:{ width: 10, height: 10, fillStyle:'#666' },
    isSource:true,
    connectorStyle : { strokeStyle:"#666", lineWidth: 5 },
    isTarget:true,
    maxConnections: 500,
    anchor: "Center",
    //uniqueEndpoint: true,
    beforeDrop: function(e) {
      var connections = jsPlumb.getConnections();
      previous_connection = _.findWhere(connections, {sourceId: e.sourceId, targetId: e.targetId});
      if (previous_connection) {
        update_bus.push({
                          action: "destroy",
                          args:   [ { source_id: e.sourceId, target_id: e.targetId } ]
                        });
      } else {
        update_bus.push({
                          action: "create",
                          args:   [ { type: "connection", source_id: e.sourceId, target_id: e.targetId } ]
                        });
      };
      return false;
    }
  };
  //var endpoint = jsPlumb.addEndpoint(e, {anchor: "Center"}, endpointOptions);
  jsPlumb.makeSource(target, endpointOptions);
  jsPlumb.makeTarget(target, endpointOptions);
  return e;
}

function read_nodes(node_messages, env) {
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
  if (node_message.type == "node") {
    var id = node_message.id;

    var e = $("#" + node_settings.id_prefix + id);
    e.remove();
  } else {
    var source = node_message.source_id;
    var target = node_message.target_id;
    var connections = jsPlumb.getConnections();
    var conn = _.findWhere(connections, {sourceId: source, targetId: target});
    if (conn) { jsPlumb.detach(conn); };
  }
}

function destroy_nodes(jsPlumb, mainContainer, node_settings, node_messages) {
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
  var node_settings = {
    "id_prefix": "node-",
    "css_class": "node",
    "width"    : 75,
    "height"   : 75
  };


  var socket = io();
  var channel = 'message';

  var update_bus = new Bacon.Bus();
  update_bus.onValue(function(message) {
    console.log('sending:', message);
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

  function type_filter(type, message)
  {
    return message.args.type == type;
  }

  function message_with(object, name, message)
  {
    var new_message = dup(message);
    new_message[name] = object
    return new_message
  }

  function functionalize_action(actions, message)
  {
    var new_message = dup(message);
    new_message.action = actions[message.action];
    return new_message;
  }

  db_events = new Bacon.Bus();
  socket.on(channel, function(message) {
    db_events.push(message);
  });

  function make_general_settings(jsPlumb, outgoing_bus)
  {
    return {
      jsPlumb: jsPlumb,
      outgoing_bus: outgoing_bus
    };
  }

  function make_node_settings(settings)
  {
    settings.dom =
    {
      "id_prefix": "node-",
      "css_class": "node",
      "width"    : 75,
      "height"   : 75
    }
    return settings;
  }

  var node_actions =
  {
    create:  create_node,
    find:    read_nodes,
    update:  update_nodes,
    destroy: destroy_nodes
  }

  //var connection_actions =
  //{
    //create:  create_connection,
    //find:    read_connections,
    //destroy: destroy_connections
  //}

  function call_function(message)
  {
    var action  = message.action;
    var args    = message.args;
    return action(args);
  }

  function add_env(env, message)
  {
    console.log(env);
    var new_message = dup(message);
    new_message.action = curry(message.action, env);
    return new_message;
  }

  var outgoing_bus = new Bacon.Bus();
  var general_settings = make_general_settings(jsPlumb, outgoing_bus)
  var node_settings = make_node_settings(general_settings);
  var connection_settings = general_settings;

  var node_events = db_events
    .filter(type_filter, "node")
    .map(functionalize_action, node_actions)
    .map(add_env, node_settings)
    .onValue(call_function);

  //var connection_events = events
    //.filter(type_filter, "connection")
    //.map(functionalize_action, connection_actions)
    //.map(function(message) {console.log(message); return message })
    //.map(message_with, connection_settings, "context")
    //.onValue(function(message) { console.log(message) });

  var initial_request = {
    action: 'find',
    args: {}
  }
  socket.emit(channel, initial_request);

});
