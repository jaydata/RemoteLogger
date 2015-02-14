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
    return redis.createClient(6379, "caravan-test-proxy1.cloudapp.net");
    //return redis.createClient();
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
    timestamp: 3,
    correlation: 4,
    parentcorrelation: 5
};
var messageType = {
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
            var parsedMsg, isBatch, channel, end;
            console.log("client message arrived", (msg || "").length);
            
            if (msg[0] == "<" && msg[1] == "@") {
                console.log("batch message");
                parsedMsg = msg;
                end = msg.indexOf("@>");
                channel = msg.substring(2, end);
                isBatch = true;
                //console.log(msg, channel);
            } else {
                parsedMsg = JSON.parse(msg);
            }

            function dispatch(msg, c, op) {
                var op = op || msg[messageField.type], 
                    c = c || msg[messageField.channel];

                console.log("dispatch", channel, op);
                switch (op) {
                    case messageType.sub:
                        console.log("sub message dispatch");
                        //6379, "caravan-test-proxy1.cloudapp.net"
                        var rc = clientSocket.receiver || (clientSocket.receiver = app.createRedisClient());
                        rc.subscribe(c, function (channel, count) {
                            console.log("subscribed to channeld", c);
                        });
                        if (!clientSocket.reveiving) {
                            clientSocket.reveiving = true;
                            rc.on("message", function (channel, msg) {
                                clientSocket.send(msg);
                            });
                        }
                        break;
                    case messageType.send:
                        console.log("publishing message");
                        var rc = clientSocket.sender || (clientSocket.sender = app.createRedisClient());
                        rc.publish(channel || msg[messageField.channel], msg);
                        break;
                }
            };
            //msg = Array.isArray(msg) ? msg : [msg];
            if (isBatch) {
                dispatch(msg, channel, messageType.send);            
            } else {
                for (var i = 0; i < parsedMsg.length ; i++) {
                    dispatch(parsedMsg[i]);
                }
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
