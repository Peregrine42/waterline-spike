var mainContainer = "diagramContainer";

jsPlumb.setContainer($("#" + mainContainer));

// utility functions
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

// message filters
function action_filter(action, message)
{
  return (message.action == action);
}

function type_filter(type, message)
{
  return message.type == type;
}

// dom manipulation
function clear_dom(origin_div, message) {
  $("." + message.type).remove();
  return message;
}

function make_node(the_document, dom_settings, message)
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

  var label_dom_element = the_document.createElement("div");
  var label_element = make_element(
      label_dom_element,
      "label hidden",
      dom_id + "-label",
      (width/2), (0-height/6),
      width, (height/3));
  if (!$(".label").hasClass("hidden") && $(".label").length > 0) {
    $(label_element).removeClass("hidden");
  };
  $(label_element).append("<span class='editable'>" + message.name + "</span>");

  modified_element.appendChild(label_element);

  return modified_element;
}

function append_to(the_parent, target) {
  the_parent.appendChild(target);

  return target;
}

function make_editable($, update_bus, label_bus, target) {
  $(".editable").mousedown(function(e) {
    e.stopPropagation();
  });
  $(".editable").mouseup(function(e) {
    e.stopPropagation();
  });
  $(".editable").editable(function(value, settings) {
    var id = target.id.split("-")[1];
    update_bus.push({
      action: "update",
      args: [ { id: id }, { name: value } ]});
    return(value)
  }, {
    style : "inherit",
    submit: "ok"
  });
  return target;
}

function get_dimension(target, label) {
  return (parseInt(target.style[label].slice(0, -2)))
}

function extract_single(message) {
  return message.args;
}

function extract_multiple(message) {
  return Bacon.fromArray(message.args);
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

function make_connection_message(source, target) {
  return {
    action: "create",
      args: [{ type: "connection", source: source, target: target }]
  }
}

function make_connection(instance, the_document, message) {
  var source_id = message.source + "-center";
  var target_id = message.target + "-center";

  instance.connect({
    uuids: [source_id, target_id],
    paintStyle:{ strokeStyle:"black", lineWidth:10 },
    hoverPaintStyle: { strokeStyle: "blue", lineWidth: 12 },
    connector: "Straight"
  });
}

function add_endpoint(instance, update_bus, element) {
  var endpoint = instance.addEndpoint(element, {
    uuid: element.getAttribute("id") + "-center",
    anchor: "Center",
    maxConnections: -1,
    isSource: true,
    isTarget: true,
    endpoint: "Rectangle",
    paintStyle: {
      fillStyle: "blue",
      radius: 10
    },
    beforeDrop: function(e) {
      update_bus.push(make_connection_message(e.sourceId, e.targetId));
      return null;
    }
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

function position_from_event(v) {
  return {
    id: null,
    //x: (v.clientX * 0.75),
    //y: (v.clientY * 0.75)
    x: (v.clientX),
    y: (v.clientY)
  }
}

function get_delta(t) {
  var a = t[1];
  var b = t[0];
  var result = {
    x: a.x - b.x,
    y: a.y - b.y
  };
  return result;
}

function make_draggable(
    flowchart_library,
    on_move,
    main_dragging_deltas,
    drag_stops,
    element)
{
  var block = $(element);

  var start_drag = block.asEventStream('mousedown');
  var end_drag = block.asEventStream('mouseup');
  var selected = start_drag.map(element.id);

  var dragging_deltas = start_drag
    .flatMap(function() {
      return on_move.map(position_from_event)
                    .slidingWindow(2, 2)
                    .map(get_delta)
                    .takeUntil(end_drag);
    })
    .map(function(val) {
      val.id = element.id;
      return val;
    });

  main_dragging_deltas.plug(dragging_deltas);
  drag_stops.plug(end_drag);

  return element;
}

function destroy_node($, settings, message) {
  var e = $("#" + settings.id_prefix + message.id);
  e.remove();
  return message;
}

function is_node($, message) {
  return message.attr("id") != undefined;
}

function not_node($, message) {
  return !is_node($, message);
}

function find_under_mouse_hover(instance, message) {
  var result = instance.select().isHover();
  return result;
}

function update_node($, settings, message) {
  var id = message.id;

  var x = message.x;
  var y = message.y;

  var e = $("#" + settings.id_prefix + id);
  e.css({ "top": y, "left": x });

  e.find('span').text(message.name);
  jsPlumb.repaintEverything();
  return message;
}

// outbound to database
function send_destroy_connection_message(outgoing_bus, message) {
  var source = message[1].sourceId;
  var target = message[1].targetId;

  outgoing_bus.push({
    action: "destroy",
    args: [{
      type: "connection",
    source: source,
    target: target
    }]
  });
}

function destroy_endpoint(instance, node_settings, message) {
  var target_uuid = "node-" + message.id + "-center";
  instance.deleteEndpoint(target_uuid);
}

function destroy_connection(instance, message) {
  var source = message.source;
  var target = message.target;
  var connections = instance.getConnections();
  var conn = _.findWhere(connections, {sourceId: source, targetId: target});
  if (conn) { instance.detach(conn); };
}

function center_click(node_settings, message) {
  return {
    x: (message.x - (node_settings.width/2)),
    y: (message.y - (node_settings.height/2))
  }
}

function set_type_to_node(message) {
  message.type = "node";
  return message;
}

function toMessage(e) {
  var e = e[0];
  var parentOffset = $("#" + mainContainer).offset();
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

// top-level composition
jsPlumb.ready(function() {
  var channel = 'message';
  var socket = io();
  var origin_div = document.getElementById("diagramContainer");

  // outgoing to server
  var outgoing_bus = new Bacon.Bus();
  var express_outgoing_bus = new Bacon.Bus();

  var node_settings = {
    id_prefix : "node-",
    css_class : "node",
    width     : 75,
    height    : 75
  };

  outgoing_bus
    .onValue(function(message) {
    console.log('sending:', message);
    socket.emit(channel, message);
  });

  express_outgoing_bus
    .onValue(function(message) {
    console.log('sending:', message);
    socket.emit(channel, message);
  });

  var raw_keydown = new Bacon.Bus();
  $(document).keydown(function(e) {
    raw_keydown.push(e);
  });

  var keydown = raw_keydown.filter(function(message) {
    return ($("form").length == 0);
  });

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

  var delete_commands = mouse_position.sampledBy(d_down, find_element)

  delete_commands
    .filter(is_node, $)
    .map(get_id)
    .filter(function(message) { return message != undefined })
    .onValue(function(id) {
      socket.emit(channel, {action: 'destroy', args: [{ id: id }]});
    });

  d_down
    .map(find_under_mouse_hover, jsPlumb)
    .flatMap(function(message) { return Bacon.fromArray(message) })
    .filter(function(result) { return result[0]; })
    .onValue(send_destroy_connection_message, outgoing_bus)


  var clicked = Bacon.fromEventTarget($(document), "click");

  clicked.bufferWithTimeOrCount(200, 2)
    .filter(function(x) { return x.length == 2 })
    .map(toMessage)
    .map(center_click, node_settings)
    .map(set_type_to_node)
    .onValue(function(message) {
      socket.emit(channel, { action: "create", args: [message] });
    });

  // incoming from db
  var db_events = Bacon.fromEventTarget(socket, channel);

  // click and drag
  var on_move = $("html").asEventStream('mousemove');

  function move_node(instance, s) {
    var el = $("#"+s.id);
    var pos = el.position();
    var top = pos.top;
    var left = pos.left;
    el.css( {
      top: top+s.y + "px",
      left: left+s.x + "px"
    } );
    instance.repaintEverything();
  }

  function position_update(message) {
    var dom_id = message.id;
    var element = $("#" + dom_id);

    var x = element.css("left");
    var y = element.css("top");

    var id = dom_id.split("-")[1];
    return {
      action: "update",
      args: [ {
        id: id,
      },
      {
        x: x,
        y: y
      } ]
    };
  }

  function extract_id(message) {
    return { id: message.target.id };
  }

  var onMove = $("html").asEventStream('mousemove');
  var main_dragging_deltas = new Bacon.Bus();
  var drag_stops = new Bacon.Bus();
  var label_triggers = new Bacon.Bus();
  var not_editing = label_triggers
    .map(function(message) { console.log(message); return (message); })
    .scan(
      true,
      function(message) {return message});
  not_editing.onValue(function(message) { console.log(message) });
  main_dragging_deltas.filter(not_editing).onValue(move_node, jsPlumb);
  //main_dragging_deltas.onValue(function(message) {console.log(message)});
  outgoing_bus.plug(main_dragging_deltas
    .filter(not_editing)
    .throttle(500)
    .map(position_update));

  outgoing_bus.plug(drag_stops
    .filter(not_editing)
    .map(extract_id)
    .map(position_update));
  // end of click and drag

  var new_from_db = db_events
    .filter(action_filter, "create")
    .map(extract_single)

  var read_results = db_events
    .filter(action_filter, "find")
    .map(clear_dom, document.body)
    .flatMap(extract_multiple)

  var new_nodes = new_from_db.merge(read_results)
    .filter(type_filter, "node")
    .map(make_node, document, node_settings)
    .map(append_to, origin_div)
    .map(make_editable, $, outgoing_bus, label_triggers)
    .map(make_draggable, jsPlumb, on_move, main_dragging_deltas, drag_stops)
    .onValue(add_endpoint, jsPlumb, outgoing_bus)

  var updates_from_db = db_events
    .filter(action_filter, "update")
    .flatMap(extract_multiple)

  var updates = updates_from_db
    .filter(type_filter, "node")
    .onValue(update_node, $, node_settings)

  var destroyed_nodes = db_events
    .filter(action_filter, "destroy")
    .flatMap(extract_multiple)
    .map(destroy_node, $, node_settings)
    .onValue(destroy_endpoint, jsPlumb, node_settings)

  var new_connections = new_from_db.merge(read_results)
    .filter(type_filter, "connection")
    .onValue(make_connection, jsPlumb, document)

  var destroyed_connections = db_events
    .filter(action_filter, "destroy")
    .flatMap(extract_multiple)
    .onValue(destroy_connection, jsPlumb)


  //window.setZoom = function(zoom, instance, transformOrigin, el) {
    //transformOrigin = transformOrigin || [ 0.5, 0.5 ];
    //instance = instance || jsPlumb;
    //el = el || instance.getContainer();
    //var p = [ "webkit", "moz", "ms", "o" ],
        //s = "scale(" + zoom + ")",
        //oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";

    //for (var i = 0; i < p.length; i++) {
      //el.style[p[i] + "Transform"] = s;
      //el.style[p[i] + "TransformOrigin"] = oString;
    //}

    //el.style["transform"] = s;
    //el.style["transformOrigin"] = oString;

    //instance.setZoom(zoom);
    //jsPlumb.repaintEverything();
  //};

  //setZoom(0.75, jsPlumb, null, null);

  //zoom.to({scale: 2});

  $(document).keydown(function(e) {
    switch(e.which) {
      case 37: // left
        var jq_origin_div = $(origin_div);
        var current_left = parseInt(jq_origin_div.css("left").split("px")[0]);
        jq_origin_div.css({ left: current_left+10 });
        break;

      case 38: // up
        var jq_origin_div = $(origin_div);
        var current_top = parseInt(jq_origin_div.css("top").split("px")[0]);
        jq_origin_div.css({ top: current_top+10 });
        break;

      case 39: // right
        var jq_origin_div = $(origin_div);
        var current_left = parseInt(jq_origin_div.css("left").split("px")[0]);
        jq_origin_div.css({ left: current_left-10 });
        break;

      case 40: // down
        var jq_origin_div = $(origin_div);
        var current_top = parseInt(jq_origin_div.css("top").split("px")[0]);
        jq_origin_div.css({ top: current_top-10 });
        break;

      default: return; // exit this handler for other keys
    }
    e.preventDefault(); // prevent the default action (scroll / move caret)
  });

  socket.emit(channel, make_find_message());
});
