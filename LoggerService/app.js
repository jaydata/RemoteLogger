var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var redis = require('redis');
var WebSocketServer = require('ws').Server;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


module.exports = app;

app.createRedisClient = function () {
    //
    console.log("creating redis client");
    //return redis.createClient(6379, "caravan-test-proxy1.cloudapp.net");
    return redis.createClient();
}
//app.use('/', routes);
app.use('/users', users);
app.use('/log', require('./routes/log.js'));
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
var messageField = {
    type: 0,
    channel: 1,
    data: 2,
    timestamp: 3
};
var messageType  = {
    sub: 0,
    send: 1
}
var appListen = app.listen;
app.listen = function (port, done) {
    var server = appListen.apply(app, [port, done]);
    var wss = new WebSocketServer({
        server: server, path: "/ws"
    });
    
    wss.on('connection', function (clientSocket) {
        console.log("wss connection");
        
        clientSocket.on('message', function (msg) {
            console.log("client message arrived", (msg || "").length);
            var msg = JSON.parse(msg);
            function dispatch(msg) {
                switch (msg[messageField.type]) {
                    case messageType.sub:
                        //6379, "caravan-test-proxy1.cloudapp.net"
                        var rc = clientSocket.receiver || (clientSocket.receiver = app.createRedisClient());
                        rc.subscribe(msg[messageField.channel], function (channel, count) {
                            console.log("subscribed to channeld", msg[messageField.channel]);
                        });
                        if (!clientSocket.reveiving) {
                            clientSocket.reveiving = true;
                            rc.on("message", function (channel, msg) {
                                msg = JSON.parse(msg);
                                clientSocket.send(JSON.stringify([messageType.send, channel, msg, null]));
                            });
                        }
                        break;
                    case messageType.send:
                        //6379, "caravan-test-proxy1.cloudapp.net")
                        //console.log("publishing message", msg.data);
                        var rc = clientSocket.sender || (clientSocket.sender = app.createRedisClient());
                        rc.publish(msg[messageField.channel], JSON.stringify({
                            t: msg[messageField.timestamp], 
                            d: msg[messageField.data]
                        }));
                        //console.log("publishing message done");
                        break;
                }
            }            ;
            msg = Array.isArray(msg) ? msg : [msg];
            for (var i = 0; i < msg.length ; i++) {
                dispatch(msg[i]);
            }
            //console.log("client message %s", msg);
            //clientSocket.send('echo ' + msg);
        });

        clientSocket.on("close", function () {
            console.log("client closed. disposing...");
            clientSocket.receiver && clientSocket.receiver.end();
            clientSocket.sender && clientSocket.sender.end();
            //console.log("client aquittal");
        });
    });
    
    return server;
}



module.exports = app;
