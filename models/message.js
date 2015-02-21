var Waterline = require('waterline');
var Bacon     = require('baconjs');

var bus = new Bacon.Bus();

var Message = Waterline.Collection.extend({
  identity: 'message',

  connection: 'myLocalDisk',

  afterCreate: function(record, next) {
    var message = {
      action: 'create',
      params: [record]
    }
    bus.push(message);
    next();
  },

  afterUpdate: function(record, next) {
    var message = {
      action: 'update',
      params: [{ id: record.id }, record]
    }
    bus.push(message);
    next();
  },

  afterDestroy: function(record, next) {
    var message = {
      action: 'destroy',
      params: [ {id: record.id} ]
    }
    bus.push(message);
    next();
});

module.exports = { model: Message, changes: bus };
