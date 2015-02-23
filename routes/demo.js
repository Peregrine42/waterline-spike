var exports = module.exports;

exports.modify = function add_demo(app) {
  app.get('/demo', function(req, res) {
      res.render('demo');
  });

  return app
}
