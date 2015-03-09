function extract_id(message) {
  return { id: message.target.id.split("-")[1] };
}

function set_type_to_node(message) {
  message.type = "graph_node";
  return message;
}

function message_filter(attr, action, message)
{
  console.log("filtering", [attr, action, message]);
  return (message[attr] == action);
}

function extract_single(message) {
  return message.args;
}

function extract_multiple(bacon, message) {
  return bacon.fromArray(message.args);
}

function make_find_message() {
  return {
    type: "graph_node",
    action: "find",
    args: {}
  }
}

// nodes
function create_node_message(message) {
  return { type: "graph_node", action: "create", args: [message] };
}

function destroy_node_message(id) {
  return { type: "graph_node", action: "destroy", args: [{ id: id }] };
}

function position_update(message) {
  return {
    type: "graph_node",
    action: "update",
    args: [ { id: message.id }, message ]
  };
}

// connections
function send_destroy_connection_message(outgoing_bus, message) {
  var source = message[1].sourceId;
  var target = message[1].targetId;

  outgoing_bus.push({
    type: "connection",
    action: "destroy",
    args: [{
      type: "connection",
    source: source,
    target: target
    }]
  });
}

function make_connection_message(source, target) {
  return {
    type: "connection",
    action: "create",
      args: [{ type: "connection", source: source, target: target }]
  }
}

function find_connection_message() {
  return {
    type: "connection",
    action: "find",
    args: {}
  }
}
