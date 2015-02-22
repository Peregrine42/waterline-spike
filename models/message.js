var Waterline = require('waterline');
var Bacon     = require('baconjs');

var Message = Waterline.Collection.extend({
  identity: 'message',

  connection: 'myLocalDisk',

});

module.exports = Message;
