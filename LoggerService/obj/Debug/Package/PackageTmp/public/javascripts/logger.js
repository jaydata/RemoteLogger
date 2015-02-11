///<reference path="/public/javascripts/jquery.js" />

function putter(name) {
    return function (value) {
        window[name] = value;
        return value;
    }
}

var loggerApi = {
    
    createLogger: function (name) {
        var logger = {};
        return $.Deferred(function (defer) {
            var ws = new WebSocket("wss://" + window.location.host  + ":443/ws");
            ws.onopen = function()
            {
                logger.sub = function (logname) {
                    ws.send(JSON.stringify({ type: "sub", channel: logname }));
                }

                logger.log = function (data, logname) {
                    window.setTimeout(function () {
                        ws.send(JSON.stringify({ type: "send", channel: logname || name, data: data, sent: new Date() }));
                    }, 0);
                }
                //Web Socket is connected, send data using send()
                //ws.send(JSON.stringify({ text: "Message to send" }));
                //alert("Message is sent...");
                defer.resolve(logger);
            };

            ws.onmessage = function (message) {
                console.log("client msg in", arguments)
            }

            ws.onclose = function () {
                alert("connection closed");
            }
        });
    }
}