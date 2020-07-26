import {NextFunction, Request, Response} from "express";
import {SearchParams} from "./api/types";
import {searchPhotos} from "./api/search";

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

router.get('/copyright', function (req: Request, res: Response, next: NextFunction) {
    res.locals.subtitle = 'Copyright';
    res.render('copyright');
});

module.exports = router;
