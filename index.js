var express         = require('express');
var app             = express();
var http            = require('http').Server(app);

var add_root        = require('./routes/root').add_root;
var add_handlebars  = require('./routes/handlebars').add_handlebars;

app.use(express.static(__dirname + '/public'));

app = add_root(app);
app = add_handlebars(app);

http.listen(3000, function() {
    console.log('listening on *:3000');
});
