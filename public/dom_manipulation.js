function clear_dom($, origin_div, message) {
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


  return [message, modified_element];
}

function add_label($, the_document, dom_settings, message) {
  var original_message = message[0];
  var modified_element = message[1];

  var id = message.id;
  var width = dom_settings.width;
  var height = dom_settings.height;
  var dom_id = dom_settings.id_prefix + id;

  var label_x = (width/2);
  var label_y = (0-height/6);
  var label_width = width;
  var label_height = (height/3);
  var label_dom_element = the_document.createElement("div");
  var label_element = make_element(
      label_dom_element,
      "label hidden",
      dom_id + "-label",
      label_x, label_y,
      label_width, label_height);
  if (!$(".label").hasClass("hidden") && $(".label").length > 0) {
    $(label_element).removeClass("hidden");
  };
  $(label_element)
    .append(
        "<span class='editable'>" +
          original_message.name +
        "</span>");

  modified_element.appendChild(label_element);
  return modified_element;
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

function find_element(position, message) {
  return $(document.elementFromPoint(position.x, position.y));
};

function get_id(message) {
  return message.attr("id").split("-")[1];
};

function set_node_position(instance, s) {
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

function get_position($, message) {
  var dom_id = message.id;
  var element = $("#" + dom_id);

  var x = element.css("left");
  var y = element.css("top");

  var id = dom_id.split("-")[1];

  return { id: id, x: x, y: y };
}

function destroy_node($, settings, message) {
  var e = $("#" + settings.id_prefix + message.id);
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

function update_node($, settings, message) {
  var id = message.id;

  var x = message.x;
  var y = message.y;

  var e = $("#" + settings.id_prefix + id);
  //e.animate({ "top": y, "left": x }, 500);
  e.css({ "top": y, "left": x });

  e.find("span").text(message.name);
  jsPlumb.repaintEverything();
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
