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


function create_node(factory, message) {
  console.log(env);
  console.log(message);
  var jsPlumb       = env.jsPlumb;
  var node_settings = env.dom;
  var outgoing_bus  = env.outgoing_bus;

  var id = node_message.id;
  var x = node_message.x;
  var y = node_message.y;

  return e;
}

function make_element(e, css_class, id, x, y, width, height)
{
  e.id = id;
  e.className = css_class;
  e.style.left   = x;
  e.style.top    = y;
  e.style.width  = width;
  e.style.height = height;
  return e;
}

function make_draggable(element, flowchart_library, update_bus)
{
  flowchart_library.draggable(
      outer_element,
      { containment: "parent",
        stop: function(e) {
                var new_x = e.pos[0];
                var new_y = e.pos[1];
                update_bus.push(make_update_message(id, new_x, new_y));
              }
      });
}

function make_connection_element(the_document, dom_settings)
{
  var connection_dom_element = the_document.createElement("div");
  var connection_css_class = dom_settings.css_class;
  var connection_dom_id = outer_dom_id + "_1";
  var connection_width = outer_width - 20;
  var connection_height = outer_height - 20;
  var connection_x = (outer_width/2) - (connection_width/2);
  var connection_y = (outer_height/2) - (connection_height/2);

  var connection_element = make_element(
      connection_dom_element,
      connection_css_class,
      connection_dom_id,
      connection_x, connection_y,
      connection_width, connection_height);
  return connection_element;
}

function make_node_element(the_document, dom_settings)
{
  var element = document.createElement("div");
  var css_class = dom_settings.css_class;
  var outer_dom_id = dom_settings.id_prefix + id;
  var outer_width = dom_settings.width;
  var outer_height = dom_settings.height;

  var outer_element = make_element(
      element,
      css_class,
      dom_id,
      x, y,
      outer_width, outer_height);
}

function node_factory(flowchart_library, the_document, dom_settings, update_bus)
{
  var outer_element = make_node_element(the_document, dom_settings);
  document.appendChild(outer_element);

  var connection_element = make_connection_element(the_document, dom_settings);
  outer_element.appendChild(connection_element);

  make_draggable(outer_element, flowchart_library, update_bus);
  make_endpoint(connection_element, update_bus);
}

function send_drop_to_db() {
  var connections = flowchart_library.getConnections();
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

function make_endpoint(target, bus_to_db)
{
  var endpointOptions = {
    paintStyle:{ width: 10, height: 10, fillStyle:'#666' },
    isSource:true,
    connectorStyle : { strokeStyle:"#666", lineWidth: 5 },
    isTarget:true,
    maxConnections: 500,
    anchor: "Center",
    //uniqueEndpoint: true,
    beforeDrop: function(e) {
      bus_to_db.push(e);
    }
  };
  //var endpoint = jsPlumb.addEndpoint(e, {anchor: "Center"}, endpointOptions);
  flowchart_library.makeSource(target, endpointOptions);
  flowchart_library.makeTarget(target, endpointOptions);
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
  var channel = 'message';
  var socket = io();

  var outgoing_bus = new Bacon.Bus();

  var env = {
    jsPlumb: jsPlumb,
    outgoing_bus: outgoing_bus
  };

  var node_settings = {
    "id_prefix": "node-",
    "css_class": "node",
    "width"    : 75,
    "height"   : 75
  };

  outgoing_bus.onValue(function(message) {
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


  var create_node_jsPlumb = curry(create_node, node_settings);

  var node_actions =
  {
    create:  create_node_jsPlumb,
    //find:    read_nodes_jsPlumb,
    //update:  update_nodes_jsPlumb,
    //destroy: destroy_nodes_jsPlumb
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

  var node_events = db_events
    .filter(type_filter, "node")
    .map(functionalize_action, node_actions)
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
