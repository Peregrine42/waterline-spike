var exports = module.exports;

exports.add_root = function add_root(app) {
  app.get('/', function(req, res) {
      res.render('index');
  });

  return app
}
