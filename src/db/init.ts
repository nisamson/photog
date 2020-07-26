import mongoose, {Mongoose} from "mongoose";
const process = require('process');

const URIPrefix = 'mongodb://';


export function initConn(db_url: String, db_user: String, db_pass: String): Promise<Mongoose> {
    if (db_url.startsWith(URIPrefix)) {
        db_url = db_url.substring(URIPrefix.length);
    }

    return mongoose.connect(`mongodb://${db_user}:${db_pass}@${db_url}`, {autoReconnect: false, useNewUrlParser: true, useUnifiedTopology: true}, (err) => {
        if (err) {
            console.error(`Could not connect to database: ${err}`);
            process.exit(1);
        }
    });
}
