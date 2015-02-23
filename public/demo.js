jsPlumb.ready(function() {
  //jsPlumb.connect({
    //source:"item_left",
    //target:"item_right",
    //endpoint:"Rectangle",
    //connector: ["Straight"],
    //anchor: ["Center", "Center"],
    //endpoint:"Dot",
    //paintStyle:{ strokeStyle:"blue", lineWidth:5 },
    //endpointStyle:{ fillStyle:"blue" }
  //});

  $('diagramContainer').append("<div id='test' class='item'></div>")

  var instance = jsPlumb.getInstance({
    DragOptions: { zIndex: 500000 },
    PaintStyle:  { strokeStyle: 'blue' },
    Anchors: ["Center"],
    Container: "diagramContainer"
  });

  instance.doWhileSuspended(function() {
    var exampleColor = 'green'
    var exampleEndpoint = {
      endpoint:"Rectangle",
      paintStyle:{ width:25, height:21, fillStyle:exampleColor },
      isSource:true,
      reattach:true,
      scope:"blue",
      connectorStyle : {
        gradient:{stops:[[0, exampleColor], [0.5, "#09098e"], [1, exampleColor]]},
        lineWidth:5,
        strokeStyle:exampleColor,
        dashstyle:"2 2"
      },
      isTarget:true,
    };

    var e1 = instance.addEndpoint('test', { anchor:[0.5, 1, 0, 1] }, exampleEndpoint);

    jsPlumb.fire("jsPlumbDemoLoaded", instance);

  });

  jsPlumb.draggable("item_left");

  var common = {
    isSource:true,
    isTarget:true,
    endpoint:"Dot",
    paintStyle:{ fillStyle:"blue", strokeStyle:"blue", lineWidth:5 },
    connector: ["Straight"]
  };

  jsPlumb.addEndpoint("item_left", {
    anchors:["Center"]
  }, common);

  jsPlumb.addEndpoint("item_right", {
    anchors:["Center"]
  }, common);
});
