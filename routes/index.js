var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.json({ message: 'DeathBed backend is running' });
});

module.exports = router;