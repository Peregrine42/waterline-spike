function position_from_event(v) {
  return {
    id: null,
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

function has_valid_target(e) {
  return $(e.target).hasClass("node");
}

function make_draggable(
    flowchart_library,
    on_move,
    main_dragging_deltas,
    drag_starts,
    drag_stops,
    element)
{
  var start_drag = element.asEventStream("mousedown");
  element.mousedown(function(e) {
    e.preventDefault();
  });
  var end_drag = $("html").asEventStream("mouseup");
  var selected = start_drag.map(element.attr("id"));

  var dragging_deltas = start_drag
    .flatMap(function() {
      return on_move.map(position_from_event)
                    .slidingWindow(2, 2)
                    .map(get_delta)
                    .takeUntil(end_drag);
    })
    .map(function(val) {
      val.id = element.attr("id").split("-")[1];
      return val;
    });

  drag_starts.plug(start_drag.filter(has_valid_target));
  main_dragging_deltas.plug(dragging_deltas);
  drag_stops.plug(end_drag.filter(has_valid_target));

  return element;
}
