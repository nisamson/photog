import {rateLimiterMiddleware} from "./routes/middleware";

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
const session = require('express-session');
const dbInit = require('./db/init');
const dotenv = require('dotenv');
import passport from 'passport';
import argon2, {argon2id} from 'argon2';

dotenv.config();


console.info(`Connecting to DB at ${process.env.DB_URL}`);
(async function () {
    await dbInit.initConn(process.env.DB_URL, process.env.DB_USER, process.env.DB_PASS).catch(e => console.error(e)).then(_ => console.log("Connected to DB."))
})();

import {Photo} from "./db/schema";

(async function () {
    await Photo.countDocuments({}).exec((_, n) => console.info(`DB contains ${n} photos.`))
})();

const root: string = path.join(__dirname, '..');

var indexRouter = require('./routes');
import {router as apiRouter} from "./routes/api";
import {LoginUser, User, UserDoc} from "./db/auth";
import {Strategy} from "passport-local";


passport.use(new Strategy(async function (username, pass, next) {
    try {
        let user = await User.findOne({name: username});
        if (!user) {
            return next(null, false);
        }

        if (await argon2.verify(user.passHash.toString(), pass, {
            type: argon2id,
        })) {
            return next(null, user);
        } else {
            return next(null, false);
        }

    } catch (e) {
        return next(e);
    }
}));

passport.serializeUser(function(user: UserDoc, cb) {
    cb(null, user.id.toString());
});

passport.deserializeUser(async function(id: string, cb) {
    await User.findById(id, function (err, user) {
        if (err) {
            return cb(err);
        } else {
            return cb(null, user);
        }
    });
});

var app = express();

// view engine setup
app.set('views', path.join(root, 'views'));
app.set('view engine', 'ejs');

app.use(session({secret: process.env.JWT_SECRET, resave: true, saveUninitialized: false}));
app.use(favicon(path.join(root, 'public', 'images', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(root, 'public'), {
    maxAge: '1y'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
    res.locals.loggedIn = typeof req.user != "undefined";
    next();
})
app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

const HttpStatus = require('http-status-codes');

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    let statusCode: number = err.status || 500;

    res.locals.message = HttpStatus.getStatusText(statusCode);

    // render the error page
    res.status(statusCode);
    res.render('error', {subtitle: "Error", statusCode: statusCode});
});

module.exports = app;
