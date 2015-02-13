var exp_handlebars  = require('express-handlebars');

module.exports.add_handlebars = function(app) {
  app.engine('handlebars', exp_handlebars({defaultLayout: 'main'}));
  app.set('view engine', 'handlebars');
  return app;
}
