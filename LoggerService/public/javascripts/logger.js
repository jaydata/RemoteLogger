///<reference path="/public/javascripts/jquery.js" />

function putter(name) {
    return function (value) {
        window[name] = value;
        return value;
    }
}

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

var loggerApi = {
    createLoggerLight: function (name, uri) {
        var logger = {};
        function createStamp() { return new Date().getTime() };
        var ws= ws1 = new WebSocket("ws://" + uri || (window.location.host + "/ws"));
        logger.corrId = 0;
        ws.onopen = function () {
            window.setInterval(function () {
                if (logger.logs.length) {
                    var _l = logger.logs;
                    console.log("@@@", _l);
                    ws.send("<@" + name + "@>" + JSON.stringify(_l));
                    logger.logs = [];
                }
            }, 500);
        };
        logger.socket = ws;
        
        logger.logs = [];
        
        

        logger.log = function (data, logname) {
            logger.logs.push([messageType.send, logname || name, data, createStamp()]);
        };
        
        logger.pstart = function (pname, ppid, logname) {
            var corrId = logger.corrId++;
            var finish = function () {
                logger.logs.push([messageType.send, logname || name, pname, createStamp(), -corrId]);
            };
            logger.logs.push([messageType.send, logname || name, pname, createStamp(), corrId]);
            return finish;
        };

        return logger;
    },
    createLogger: function (name, uri) {
        var logger = {};
        return $.Deferred(function (defer) {
            var ws = ws2 = new WebSocket("ws://" + uri || (window.location.host  + "/ws"));
            logger.socket = ws;
            
            logger.logs = [];
            
            logger.log = function (data, logname) {
                logger.logs.push([ messageType.send, logname || name, data, new Date().getTime()]);
            }
            
            ws.onopen = function ()
            {
                logger.sub = function (logname) {
                    ws.send(JSON.stringify([[ messageType.sub, logname, null, null]]));
                }
                
                window.setInterval(function () {
                    if (logger.logs.length) {
                        var _l = logger.logs;
                        console.log("@@@", _l);
                        ws.send("<@" + name + "@>" + JSON.stringify(_l));
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
                
                var parsedMsg, isBatch, end, msg = message.data;
                if (msg[0] == "<" && msg[1] == "@") {
                    console.log("batch message");
                    end = msg.indexOf("@>");
                    channel = msg.substring(2, end);
                    parsedMsg = msg.substring(end + 2);
                    parsedMsg = JSON.parse(parsedMsg);
                    isBatch = true;
                    if (logger.onmessage) {
                        parsedMsg.forEach(function (_msg) {
                            _msg[messageField.channel] = channel;
                            logger.onmessage(_msg);
                        });
                    }

                } else {
                    parsedMsg = JSON.parse(msg);
                    if (logger.onmessage) {
                        parsedMsg.forEach(function (_msg) {
                            logger.onmessage(_msg);
                        });
                    }
                }

            }

            ws.onclose = function () {
                alert("connection closed");
            }
        }).promise(logger);
    }
}