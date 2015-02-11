var express = require('express');
var redis = require('redis');

var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    var rc = redis.createClient(6379, "caravan-test-proxy1.cloudapp.net");
    rc.pubsub("channels", res.json.bind(res));
});

module.exports = router;