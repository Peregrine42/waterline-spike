var Waterline = require('waterline');
var Bacon     = require('baconjs');

var Connection = Waterline.Collection.extend({
  identity: 'connection',
  connection: 'myLocalDisk',
});

module.exports = Connection;
