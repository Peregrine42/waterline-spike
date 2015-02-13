var exports = module.exports;

exports.modify = function add_root(app) {
  app.get('/', function(req, res) {
      res.render('index');
  });

  return app
}
