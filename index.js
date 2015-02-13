var express  = require('express');
var app      = express();
var http     = require('http').Server(app);

app  = require('./routes/root').modify(app);
app  = require('./routes/handlebars').modify(app);

app.use(express.static(__dirname + '/public'));

http = require('./routes/restful-socket').add_channel('message', http);

http.listen(3000, function() {
    console.log('listening on *:3000');
});
