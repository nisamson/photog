import {rateLimiterMiddleware} from "./routes/middleware";

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
var dbInit = require('./db/init');
const dotenv = require('dotenv');
dotenv.config()


console.info(`Connecting to DB at ${process.env.DB_URL}`);
(async function () { await dbInit.initConn(process.env.DB_URL, process.env.DB_USER, process.env.DB_PASS).catch(e => console.error(e)).then(_ => console.log("Connected to DB.")) })();

import { Photo } from "./db/schema";

(async function () { await Photo.countDocuments({}).exec((_, n) => console.info(`DB contains ${n} photos.`)) })();

const root: string = path.join(__dirname, '..');


var indexRouter = require('./routes');
import { router as apiRouter } from "./routes/api"
var app = express();

// view engine setup
app.set('views', path.join(root, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(root, 'public', 'images', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(root, 'public'), {
  maxAge: '1y'
}));
app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

const HttpStatus = require('http-status-codes');

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  let statusCode: number = err.status || 500;

  res.locals.message = HttpStatus.getStatusText(statusCode);

  // render the error page
  res.status(statusCode);
  res.render('error', {subtitle: "Error", statusCode: statusCode });
});

module.exports = app;
