var Waterline = require('waterline');
var Bacon     = require('baconjs');

var GraphNode = Waterline.Collection.extend({
  identity: 'graph_node',
  connection: 'myLocalDisk',
});

module.exports = GraphNode;
