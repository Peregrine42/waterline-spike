var express         = require('express');
var app             = express();
var http            = require('http').Server(app);
var exp_handlebars  = require('express-handlebars');

var add_root        = require('./routes/root').add_root;

app.engine('handlebars', exp_handlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));

app = add_root(app);

http.listen(3000, function() {
    console.log('listening on *:3000');
});
