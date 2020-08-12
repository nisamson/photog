import {NextFunction, Request, Response} from "express";
import {SearchParams} from "./api/types";
import {searchPhotos} from "./api/search";
import {Metadata, Photo} from "../db/schema";
import createHttpError from "http-errors";
import mongoose from 'mongoose';
import passport from 'passport';
import errs from 'http-status-codes';
import {ensureLoggedIn, ensureLoggedOut} from "connect-ensure-login";

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req: Request, res: Response, next: NextFunction) {
    res.locals.subtitle = 'Home';
    res.render('index');
});

router.get('/browse', async function (req: Request, res: Response, next: NextFunction) {
    res.locals.subtitle = 'Browse';
    try {
        res.set('Cache-Control', 'no-store');
        let searchParams = new SearchParams(req.query);
        res.locals.searchResults = await searchPhotos(searchParams);
        res.render('browse');
    } catch (e) {
        return next(e);
    }
});

router.get('/focus/:imageId', async function (req: Request, res: Response, next: NextFunction) {
    try {
        res.setHeader('Cache-Control', 'max-age=600')

        if (!mongoose.Types.ObjectId.isValid(req.params.imageId)) {
            return next(createHttpError(404));
        }

        let photo = await Photo.findById(req.params.imageId)
            .select('name title hash uploaded tags')
            .lean(true) as Metadata;

        if (!photo) {
            return next(createHttpError(404));
        }

        res.locals.subtitle = `Focus on "${photo.title}"`;
        res.locals.photo = photo;
        res.render('focus');
    } catch (e) {
        return next(e);
    }
});

router.get('/login', ensureLoggedOut('/'), async function (req: Request, res: Response, next: NextFunction) {
    res.locals.subtitle = 'Login';
    res.locals.error = typeof req.query.error !== 'undefined';
    res.render('login');
});

router.post('/login', passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login?error=true',
}));

router.get('/edit/:imageId', ensureLoggedIn('/login'), async function(req, res, next) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.imageId)) {
            return next(createHttpError(404));
        }

        let photo = await Photo.findById(req.params.imageId)
            .select('name title hash uploaded tags')
            .lean(true) as Metadata;

        if (!photo) {
            return next(createHttpError(404));
        }

        res.locals.subtitle = `Editing "${photo.title}"`;
        res.locals.photo = photo;
        res.render('edit');
    } catch (e) {
        return next(e);
    }

});

router.post('/edit/:imageId', ensureLoggedIn('/login'), async function(req, res, next) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.imageId)) {
            return next(createHttpError(404));
        }

        let photo = await Photo.findById(req.params.imageId)
            .select('name title hash uploaded tags') as Metadata;

        if (!photo) {
            return next(createHttpError(404));
        }

        let data = req.body;
        let title = data.title;
        let tags = (data.tags).split('\n');

        photo.title = title;
        photo.tags = tags;
        await photo.save();
        res.redirect(`/focus/${req.params.imageId}`);
    } catch (e) {
        return next(e);
    }

});

router.get('/logout', ensureLoggedIn('/login'), async function(req, res, next) {
    req.logOut();
    res.redirect('/');
});

router.get('/copyright', function (req: Request, res: Response, next: NextFunction) {
    res.locals.subtitle = 'Copyright';
    res.render('copyright');
});

module.exports = router;
