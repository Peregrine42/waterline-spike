function clear_dom($, origin_div, message) {
  $("." + message.type).remove();
  return message;
}

function create_div($, message)
{
  var element = $("<div></div>");
  return [message, element]
}

function append_div(target, element)
{
  target.append(element);
  return element;
}

function make_node(dom_settings, composite_message)
{
  var message = composite_message[0];
  var element = composite_message[1];

  var id = message.id;
  var x = message.x;
  var y = message.y;

  var css_class = "node";
  var dom_id = "node-" + id;
  element.attr({"id": dom_id });
  element.addClass(css_class);
  element.css({
    top: y,
    left: x,
  })

  return [message, element];
}

function add_label(dom_settings, composite_message) {
  var message = composite_message[0];
  var element = composite_message[1];

  var id = message.id;
  var dom_id = dom_settings.id_prefix + id;

  var label_element = $("<div></div>");
  label_element.attr({"id": id });
  label_element.addClass("label hidden");

  if (!$(".label").hasClass("hidden") && $(".label").length > 0) {
    label_element.removeClass("hidden");
  };
  label_element
    .append(
        "<span class='editable'>" +
          message.name +
        "</span>");

  element.append(label_element);
  return element;
}

function append_to(the_parent, target) {
  the_parent.appendChild(target);
  return target;
}

function make_editable($, update_bus, target) {
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

function make_connection(instance, the_document, message) {
  var source_id = message.source + "-center";
  var target_id = message.target + "-center";

  instance.connect({
    uuids: [source_id, target_id],
    paintStyle:{ strokeStyle:"grey", lineWidth:10 },
    hoverPaintStyle: { strokeStyle: "lightblue", lineWidth: 12 },
    connector: "Straight"
  });
}

function add_endpoint(instance, update_bus, element) {
  var endpoint = instance.addEndpoint(element, {
    uuid: element.attr("id") + "-center",
    anchor: "Center",
    maxConnections: -1,
    isSource: true,
    isTarget: true,
    endpoint: "Rectangle",
    paintStyle: {
      radius: 10
    },
    beforeDrop: function(e) {
      update_bus.push(make_connection_message(e.sourceId, e.targetId));
      return null;
    }
  });
}

function make_element(element, css_class, id, x, y)
{
  element.attr({"id": id });
  element.addClass(css_class);
  if (x != undefined || y != undefined) {
    element.css({
      top: y,
      left: x,
    })
  }
  return element;
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

function to_message(mainContainer, e) {
  var e = e[0];
  var parentOffset = mainContainer.offset();
  var relX = e.originalEvent.pageX - (parentOffset.left);
  var relY = e.originalEvent.pageY - Math.floor(parentOffset.top);
  return { x: relX, y: relY };
};

function mouse_pick(position, message) {
  return $(document.elementFromPoint(position.x, position.y));
};

function get_id(message) {
  return message.attr("id").split("-")[1];
};

function set_node_position(instance, s) {
  var el = $("#"+ "node-" + s.id);
  var pos = el.position();
  var top = pos.top;
  var left = pos.left;
  el.css( {
    top: top+s.y + "px",
    left: left+s.x + "px"
  } );
  instance.repaintEverything();
}

function get_position($, message) {
  var dom_id = "node-" + message.id;
  var element = $("#" + dom_id);

  var x = parseInt(element.css("left").split("px")[0]);
  var y = parseInt(element.css("top").split("px")[0]);

  return { id: message.id, x: x, y: y };
}

function destroy_node($, settings, message) {
  var e = $("#" + "node-" + message.id);
  e.remove();
  return message;
}

function has_id(message) {
  return message.attr("id") != undefined;
}

function find_under_mouse_hover(instance, message) {
  var result = instance.select().isHover();
  return result;
}

function being_dragged(element)
{
  return element.hasClass("dragging");
}

function listener() { jsPlumb.repaintEverything(); }

function update_node($, settings, message) {
  var id = message.id;

  var x = message.x;
  var y = message.y;

  var e = $("#" + "node-" + id);
  if (!being_dragged(e)) {
    e.velocity(
      { "top": y, "left": x },
      { duration: 100, progress: listener, complete: listener });
  }

  e.find("span").text(message.name);
  return message;
}

function handle_arrowkeys($, origin_div, e) {
  var jq_origin_div = $(origin_div);
  switch(e.which) {
    case 37: // left
      var current_left = parseInt(jq_origin_div.css("left").split("px")[0]);
      jq_origin_div.css({ left: current_left+10 });
      break;

    case 38: // up
      var current_top = parseInt(jq_origin_div.css("top").split("px")[0]);
      jq_origin_div.css({ top: current_top+10 });
      break;

    case 39: // right
      var current_left = parseInt(jq_origin_div.css("left").split("px")[0]);
      jq_origin_div.css({ left: current_left-10 });
      break;

    case 40: // down
      var current_top = parseInt(jq_origin_div.css("top").split("px")[0]);
      jq_origin_div.css({ top: current_top-10 });
      break;

    default: return;
  }
  e.preventDefault();
}

function center_click(node_settings, message) {
  return {
    x: (message.x - (node_settings.width/2)),
    y: (message.y - (node_settings.height/2))
  }
}
