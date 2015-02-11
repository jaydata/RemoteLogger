var express = require('express');
var redis = require('redis');
var app = require('../app');

var router = express.Router();

var _rc_cache;
/* GET users listing. */
router.get('/', function (req, res) {
    //6379, "caravan-test-proxy1.cloudapp.net"
    //app.items
    //console.log(process._rc_cache);
    _rc_cache = _rc_cache|| app.createRedisClient();
    _rc_cache.pubsub("channels", function (err, result) {
        //process._rc_cache = _rc_cache;
        //rc.end();
        res.json(result);
    });
});

module.exports = router;