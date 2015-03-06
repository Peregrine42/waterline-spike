function message_filter(attr, action, message)
{
  return (message[attr] == action);
}

function extract_single(message) {
  return message.args;
}

function extract_multiple(bacon, message) {
  return bacon.fromArray(message.args);
}

function make_update_message(id, x, y) {
  return { action: "update", args: [{ id: id }, { x: x, y: y }] }
}

function make_find_message() {
  return {
    action: "find",
    args: {}
  }
}

function make_connection_message(source, target) {
  return {
    action: "create",
      args: [{ type: "connection", source: source, target: target }]
  }
}

function position_update(message) {
  return {
    action: "update",
    args: [ { id: message.id }, message ]
  };
}

function extract_id(message) {
  return { id: message.target.id };
}

function set_type_to_node(message) {
  message.type = "node";
  return message;
}

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
