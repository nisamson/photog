#!/usr/bin/env node

import path from "path";
import {initConn} from "../db/init";
import process from "process";

import yargs, {Argv} from "yargs";
import fs from 'fs';
import mongoose, {UpdateQuery} from "mongoose";
import mime from 'mime-types';
import {SHA3} from "sha3";
import {Photo, Photograph} from "../db/schema";
import expandTilde from "expand-tilde";

import sharp from 'sharp';

let dryRun = false;
let exitOnError = false;
let quietlyIgnore = false;

interface Update {
    id: string,
    tags: string[] | null,
    replaceTags: boolean,
    title: string | null
}

async function main() {
    const args = yargs.command(
        'upload [args] <photo-dirs>',
        'Uploads photos to the server.',
        (yargs) => {
            return yargs.positional('photo-dirs',
                {
                    description: "The files or directories in which photos are stored.",
                    normalize: true,
                    type: 'string',
                    array: true
                }
            ).option(
                'dry-run', {
                    alias: 'd',
                    description: 'Do all preprocessing but don\'t actually *send* the photos to the server.',
                    boolean: true,
                    default: false,
                }
            ).option('eoe', {
                alias: 'e',
                description: "Exit on error rather than trying to continue.",
                boolean: true,
                default: false,
            }).option('quietly-ignore', {
                alias: 'q',
                description: "Quietly ignore irrelevant files.",
                boolean: true,
                default: true,
            });
        }
    )
        .command(
            'update [args] <id>',
            'Updates image information',
            yargs => {
                return yargs.positional('id',
                    {
                        description: 'the ID of the image to update metadata for.',
                        type: "string",
                    }).option(
                    'title',
                    {
                        alias: 'T',
                        description: 'Replace the title of the image.',
                        type: "string",
                        requiresArg: true
                    }
                ).option(
                    'tags',
                    {
                        alias: 't',
                        description: 'Appends tags to image tags unless --replace/-r is specified.',
                        array: true
                    }
                ).option(
                    'replace',
                    {
                        description: "If set, tags will be replaced rather than appended.",
                        boolean: true,
                        default: false,
                        implies: 'tags'
                    }
                );
            }
        )
        .demandCommand()
        .completion()
        .recommendCommands()
        .help()
        .argv;

    require('dotenv').config();
    console.info("Connecting to database.");
    mongoose.set('useFindAndModify', false);
    await initConn(process.env.DB_URL, process.env.DB_USER, process.env.DB_PASS);
    mongoose.set('useFindAndModify', false);
    console.log("Connected to database.");



    const command = args._[0];

    try {
        switch (command) {
            case 'upload':
                dryRun = args["dry-run"];
                exitOnError = args.eoe;
                quietlyIgnore = args["quietly-ignore"];

                if (typeof args["photo-dirs"] === 'string') {
                    args["photo-dirs"] = [args["photo-dirs"]];
                }


                let promises = Promise.all(args["photo-dirs"].map(expandTilde).map(processFileOrDir));
                await promises;

                break;
            case 'update':
                if (!mongoose.Types.ObjectId.isValid(args.id)) {
                    throw new Error(`${args.id} is not a valid photo id.`);
                }
                let update: Update = {
                    id: args.id,
                    tags: args.tags === undefined ? null : args.tags.map(x => x.toString()),
                    replaceTags: args.replace,
                    title: args.title === undefined ? null : args.title
                };
                await processUpdate(update);
                break;

            default:
                console.error("No command specified. See --help.");
                process.exit(1);
                break;
        }
    } finally {
        await mongoose.disconnect();
        console.info("Disconnected from database.");
    }
}

async function processFile(p: string) {

    let [name, ext] = path.basename(p).split('.');
    let mimeType = mime.contentType(ext);


    if (!(mimeType && mimeType.includes("image"))) {
        if (!quietlyIgnore) {
            console.info(`Skipping ${p} because it is not an image.`);
        }
        return;
    }

    try {
        let procStream = sharp(p);

        let width;
        let height;

        await procStream.metadata()
            .then((value => {
                width = value.width;
                height = value.height;
            }));

        procStream.jpeg({
            quality: 100,
            chromaSubsampling: '4:4:4',
            force: true
        });

        let thumb = procStream.clone()
            .resize(300, 300, {
                fit: "inside"
            });

        procStream.jpeg({
            quality: 92,
            chromaSubsampling: '4:4:4',
            force: true
        })

        let [conv, thumbnail] = await Promise.all([procStream.toBuffer(), thumb.toBuffer()]);
        let hash = new SHA3(256);
        hash.update(conv);
        let digest = hash.digest().toString("hex");

        let doc = new Photo({
            hash: digest,
            name: name,
            title: name,
            thumbnail: {data: thumbnail, contentType: 'image/jpeg'},
            rawImage: {data: conv, contentType: 'image/jpeg'},
        });

        let alreadyExists = await Photo.exists({hash: digest});

        if (!alreadyExists) {
            if (dryRun) {
                console.info(`Would have saved ${p}, but this is a dry run.`);
                return;
            }
            console.info(`Saving ${p}`);
            await doc.save();
            console.info(`Saved ${p} to image id ${doc._id}`);
        } else {
            console.info(`${p} is already in the database.`);
        }
    } catch (e) {
        if (exitOnError) {
            console.error(e);
        } else {
            throw e;
        }
    }

}

async function processFileOrDir(p: string) {
    p = fs.realpathSync(p);
    let stat = fs.statSync(p);

    if (stat.isDirectory()) {
        console.info(`Entered directory: ${p}`);
        await Promise.all(fs.readdirSync(p).map(f => processFileOrDir(path.join(p, f))));
    } else if (stat.isFile()) {
        await processFile(p);
    }
}

async function processUpdate(update: Update) {
    let up: UpdateQuery<Photograph> = {};

    if (!update.title && !update.tags) {
        throw new Error("You need to specify at least one field to update.");
    }

    let sets: any = {};
    if (update.title) {
        sets.title = update.title;
    }

    if (update.tags !== null) {
        let uniqueTags = Array.from(new Set(update.tags));
        if (update.replaceTags) {
            sets.tags = uniqueTags;
        } else {
            // @ts-ignore
            up.$addToSet = {tags: uniqueTags};
        }
    }

    up.$set = sets;

    await Photo.findByIdAndUpdate(update.id, up);
}

main().catch(console.error);
