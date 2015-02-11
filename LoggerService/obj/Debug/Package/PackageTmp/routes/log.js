var express = require('express');
var redis = require('redis');

var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    res.send('respond with a resource');
});

module.exports = router;