import {NextFunction, Request, Response} from "express";
import express from "express";
import mime from "mime-types";

const createError = require('http-errors');
import errors from "http-status-codes";
import {Photo, Photograph, Thumbnail} from "../../db/schema";
import {SearchParams} from "./types";
import {searchPhotos} from "./search";

const mongoose = require('mongoose')

export const router = express.Router({strict: true})

const BATCH_SIZE = 8;

router.get("/search", (async (req, res, next) => {
    let params = new SearchParams(req.query);
    try {
        let result = await searchPhotos(params);
        let json = JSON.stringify(result);
        res.contentType('application/json');
        res.send(json);
    } catch (e) {
        return next(e);
    }
}));

router.get("/thumb/:fileName", (async (req, res, next) => {
    let [id, type]: string[] = req.params.fileName.split('.', 2);
    let contentType = <string>(mime.contentType(type) || next(createError(errors.BAD_REQUEST)));

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(errors.BAD_REQUEST));
    }

    let photo: Thumbnail;
    try {
        photo = <Thumbnail>await Photo
            .findOne({_id: id, 'thumbnail.contentType': contentType}, 'uploaded thumbnail')
            .exec();
    } catch (e) {
        return next(e);
    }

    if (!photo) {
        return next(createError(404));
    }

    let rawModDate = res.getHeader("If-Modified-Since");
    let lastModDate;
    if (typeof rawModDate === 'string' || typeof rawModDate === 'number') {
        lastModDate = new Date(rawModDate);
    } else {
        lastModDate = photo.uploaded;
    }


    res.setHeader("Last-Modified", photo.uploaded.toUTCString())
    if (lastModDate <= photo.uploaded) {
        res.contentType(contentType);
        res.send(photo.thumbnail.data);
    } else {
        res.status(errors.NOT_MODIFIED);
    }

}));

router.get("/image/:fileName", (async (req, res, next) => {
    let [id, _]: string[] = req.params.fileName.split('.', 2);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(errors.BAD_REQUEST));
    }

    try {

        let uploadedDoc = await Photo.findById(id, 'uploaded').exec();

        if (!uploadedDoc) {
            return next(createError(404));
        }

        let uploaded = uploadedDoc.uploaded;

        let rawModDate = res.getHeader("If-Modified-Since");
        let lastModDate;
        if (typeof rawModDate === 'string' || typeof rawModDate === 'number') {
            lastModDate = new Date(rawModDate);
        } else {
            lastModDate = uploaded;
        }

        res.setHeader("Last-Modified", uploaded.toUTCString());
        if (lastModDate <= uploaded) {
            let photo = <Photograph>await Photo
                .findById(id, 'rawImage')
                .exec();

            if (!photo) {
                return next(createError(404));
            }
            res.contentType(photo.rawImage.contentType.toString());
            res.send(photo.rawImage.data);
        } else {
            res.status(errors.NOT_MODIFIED);
        }

    } catch (e) {
        return next(e);
    }

}));
