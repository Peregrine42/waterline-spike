var mainContainer = $("#diagramContainer");

jsPlumb.setContainer(mainContainer);

jsPlumb.ready(function() {
  var channel = "message";
  var socket = io();
  var origin_div = document.getElementById("diagramContainer");

  // outgoing to server
  var outgoing_bus = new Bacon.Bus();

  var node_settings = {
    id_prefix : "node-",
    css_class : "node",
    width     : 75,
    height    : 75
  };

  outgoing_bus
    .onValue(function(message) {
    console.log("sending:", message);
    socket.emit(channel, message);
  });

  var raw_keydown = new Bacon.Bus();
  $(document).keydown(function(e) {
    raw_keydown.push(e);
  });

  var keydown = raw_keydown.filter(function(message) {
    return ($("form").length == 0);
  });

  keydown.onValue(handle_arrowkeys, $, origin_div);

  var mouse_position_events = new Bacon.Bus();
  $(document).mousemove(function(event) {
    mouse_position_events.push({ x: event.pageX, y: event.pageY });
  });

  var mouse_position = mouse_position_events
    .toProperty({ x: 0, y:0 });

  var d_down = keydown.filter(function(message) {
    return message.key == "d";
  });

  var editable_changed = new Bacon.Bus();

  var l_down = keydown.filter(function(message) {
    return message.key == "l";
  });

  var label_toggles = l_down.onValue(function(message) {
    if ($(".label").hasClass("hidden")) {
      $(".label").removeClass("hidden");
    } else {
      $(".label").addClass("hidden");
    }
  });

  var delete_commands = mouse_position.sampledBy(d_down, mouse_pick)

  delete_commands
    .filter(has_id)
    .map(get_id)
    .filter(function(message) { return message != undefined })
    .onValue(function(id) {
      socket.emit(channel, destroy_node_message(id));
    });

  d_down
    .map(find_under_mouse_hover, jsPlumb)
    .flatMap(function(message) { return Bacon.fromArray(message) })
    .filter(function(result) { return result[0]; })
    .onValue(send_destroy_connection_message, outgoing_bus)


  var clicked = Bacon.fromEventTarget($(document), "click");

  clicked.bufferWithTimeOrCount(200, 2)
    .filter(function(x) { return x.length == 2 })
    .map(to_message, mainContainer)
    .map(center_click, node_settings)
    .map(set_type_to_node)
    .onValue(function(message) {
      socket.emit(channel, create_node_message(message));
    });

  // incoming from db
  var db_events = Bacon.fromEventTarget(socket, channel);

  // click and drag
  var on_move = $("html").asEventStream("mousemove");

  function add_marker_class(class_name, el)
  {
    el.addClass(class_name);
  }

  function remove_marker_class(class_name, el)
  {
    el.removeClass(class_name);
  }

  function find_element($, ev)
  {
    var el = $("#"+ ev.target.id);
    return el;
  }

  var dragging_deltas = new Bacon.Bus();
  var drag_stops = new Bacon.Bus();
  var drag_starts = new Bacon.Bus();
  dragging_deltas.onValue(set_node_position, jsPlumb);
  drag_starts
    .map(find_element, $)
    .onValue(add_marker_class, "dragging");

  // constantly updating drag and drop
  //outgoing_bus.plug(dragging_deltas
    //.throttle(500)
    //.map(get_position, $)
    //.map(position_update));

  drag_stops
    .map(find_element, $)
    .onValue(remove_marker_class, "dragging");

  outgoing_bus.plug(drag_stops
    .map(extract_id)
    .map(get_position, $)
    .map(position_update));

  db_events.onValue(function(message) { console.log("received:", message) } );
  var new_from_db = db_events
    .filter(message_filter, "action", "create")
    .map(extract_single)

  var read_results = db_events
    .filter(message_filter, "action", "find")
    .map(clear_dom, $, mainContainer)
    .flatMap(extract_multiple, Bacon)

  var new_nodes = new_from_db.merge(read_results)
    .filter(message_filter, "type", "node")
    .map(create_div, $)
    .map(make_node, node_settings)
    .map(add_label, node_settings)
    .map(append_div, mainContainer)
    .map(make_editable, $, outgoing_bus)
    .map(make_draggable,
        jsPlumb,
        on_move,
        dragging_deltas,
        drag_starts,
        drag_stops)
    .onValue(add_endpoint, jsPlumb, outgoing_bus)

  var updates_from_db = db_events
    .filter(message_filter, "action", "update")
    .flatMap(extract_multiple, Bacon)

  var updates = updates_from_db
    .filter(message_filter, "type", "node")
    .onValue(update_node, $, node_settings)

  var destroyed_nodes = db_events
    .filter(message_filter, "action", "destroy")
    .flatMap(extract_multiple, Bacon)
    .map(destroy_node, $, node_settings)
    .onValue(destroy_endpoint, jsPlumb, node_settings)

  var new_connections = new_from_db.merge(read_results)
    .filter(message_filter, "type", "connection")
    .onValue(make_connection, jsPlumb, document)

  var destroyed_connections = db_events
    .filter(message_filter, "action", "destroy")
    .flatMap(extract_multiple, Bacon)
    .onValue(destroy_connection, jsPlumb)

  socket.emit(channel, make_find_message());
});
