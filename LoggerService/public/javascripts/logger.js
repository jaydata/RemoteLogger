///<reference path="/public/javascripts/jquery.js" />

function putter(name) {
    return function (value) {
        window[name] = value;
        return value;
    }
}

var loggerApi = {
    
    createLogger: function (name, uri) {
        var logger = {};
        return $.Deferred(function (defer) {
            var ws = new WebSocket("ws://" + (uri || window.location.host)  + "/ws");
            logger.socket = ws;
            
            logger.logs = [];
            
            logger.log = function (data, logname) {
                logger.logs.push({ type: "send", channel: logname || name, data: data, sent: new Date().getTime() });
            }
            
            ws.onopen = function ()
            {
                logger.sub = function (logname) {
                    ws.send(JSON.stringify({ type: "sub", channel: logname }));
                }
                
                window.setInterval(function () {
                    if (logger.logs.length) {
                        var _l = logger.logs;
                        ws.send(JSON.stringify(_l));
                        logger.logs = [];
                    }
                }, 500);
                //window.setTimeout(function () {
                //    ws.send(JSON.stringify());
                //}, 0);

                //Web Socket is connected, send data using send()
                //ws.send(JSON.stringify({ text: "Message to send" }));
                //alert("Message is sent...");
                defer.resolve(logger);
            };

            ws.onmessage = function (message) {
                console.log("client msg in", arguments);
                var msg = JSON.parse(message.data);
                logger.onmessage && logger.onmessage(msg);

            }

            ws.onclose = function () {
                alert("connection closed");
            }
        }).promise(logger);
    }
}