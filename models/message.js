var Waterline = require('waterline');

var Message = Waterline.Collection.extend({
  identity: 'message',

  connection: 'myLocalDisk',

  attributes: {
    text: 'string'
  }
});

module.exports = Message;
