var Waterline = require('waterline');

var Message = Waterline.Collection.extend({
  identity: 'message',

  connection: 'myLocalDisk',

  //afterCreate: function(record, next) {

  //}
});

module.exports = Message;
