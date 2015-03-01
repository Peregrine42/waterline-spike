var mainContainer = "diagramContainer";

jsPlumb.setContainer($("#" + mainContainer));

function action_filter(action, message)
{
  return (message.action == action);
}

function make_parent(the_document, dom_settings, message)
{
  var id = message.id;
  var x = message.x;
  var y = message.y;

  var css_class = dom_settings.css_class;
  var dom_id = dom_settings.id_prefix + id;
  var width = dom_settings.width;
  var height = dom_settings.height;
  var element = the_document.createElement("div");
  var modified_element = make_element(
      element,
      css_class,
      dom_id,
      x, y,
      width, height);
  return modified_element;
}

function append_to(the_parent, target) {
  the_parent.appendChild(target);
  return target;
}

function get_dimension(target, label) {
  return (parseInt(target.style[label].slice(0, -2)))
}

function make_target(the_document, the_parent) {
  var parent_width = get_dimension(the_parent, "width");
  var parent_height = get_dimension(the_parent, "height");

  var width = parent_width*0.6;
  var height = parent_height*0.6;
  var x = (parent_width - width)/2;
  var y = (parent_height - height)/2;
  var dom_id = the_parent.id + "_target"
    var css_class = the_parent.className;
  var element = the_document.createElement("div");
  var modified_element = make_element(
      element,
      css_class,
      dom_id,
      x, y,
      width, height);
  append_to(the_parent, modified_element);
  return the_parent;
}

function just_args(message) {
  return message.args;
}

function type_filter(type, message)
{
  return message.args.type == type;
}

function internal_type_filter(type, message)
{
  return message.type == type;
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

function extract_multiple(message) {
  return Bacon.fromArray(message.args);
}

function clear_dom(origin_div, message) {
  $("." + message.type).remove();
  return message;
}

function make_update_message(id, x, y) {
  return { action: "update", args: [{ id: id }, { x: x, y: y }] }
}

function make_find_message() {
  return {
    action: 'find',
    args: {}
  }
}

function create_connection(jsPlumb,
    settings,
    message) {
  var e = jsPlumb.connect({ source: message.source_id,
    target: message.target_id,
  });
}


function make_element(e, css_class, id, x, y, width, height)
{
  e.id = id;
  e.className = css_class;
  var element = $(e);
  element.css({
    top: y,
    left: x,
    width: width,
    height: height
  })
  return e;
}

function make_draggable(flowchart_library, update_bus, element)
{
  flowchart_library.draggable(
      element,
      { containment: "parent",
        stop: function(e) {
                console.log(e);
                var new_x = e.pos[0];
                var new_y = e.pos[1];
                var id = e.el.id.split("-")[1];
                update_bus.push(make_update_message(id, new_x, new_y));
              }
      });

  return element;
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

function make_endpoint(target, flowchart_library, bus_to_db)
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

  var origin_div = document.getElementById("diagramContainer");

  var node_settings = {
    id_prefix : "node-",
  css_class : "node",
  width     : 75,
  height    : 75
  };

  var env = {
    flowchart_library: jsPlumb,
  outgoing_bus: outgoing_bus,
  dom_settings: node_settings,
  the_document: document,
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

  db_events = new Bacon.Bus();
  socket.on(channel, function(message) {
    db_events.push(message);
  });

  var new_nodes_from_db = db_events
    .filter(action_filter, "create")
    .map(just_args)
    .filter(internal_type_filter, "node")

  var read_results = db_events
    .filter(action_filter, "find")
    .map(clear_dom, origin_div)
    .flatMap(extract_multiple)

  var new_nodes = new_nodes_from_db.merge(read_results)
    .map(make_parent, document, node_settings)
    .map(append_to, origin_div)
    .map(make_target, document)
    .map(make_draggable, jsPlumb, outgoing_bus)
    .onValue(function(target) { console.log(target); return target; } )

  socket.emit(channel, make_find_message());

});
