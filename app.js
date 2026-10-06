require('dotenv').config();
var cors = require('cors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var decisionsRouter = require('./routes/decisions'); // add this
var journalsRouter = require('./routes/journals');
var searchRouter = require('./routes/search');


var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/decisions', decisionsRouter); // add this
app.use('/journals', journalsRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/search', searchRouter);

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Server running on http://localhost:' + port);
});

module.exports = app;