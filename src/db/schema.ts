import mongoose, {FilterQuery, Model, PaginateModel, PaginateOptions, PaginateResult} from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

const Schema = mongoose.Schema;

export const photoSchema = new Schema({
    name: String,
    title: String,
    hash: String,
    uploaded: { type: Date, default: Date.now },
    thumbnail: { data: Buffer, contentType: String },
    tags: [String]
});

photoSchema.index({"$**": "text"});
photoSchema.index({uploaded: -1});
photoSchema.index({hash: 1}, {unique: true});
photoSchema.plugin(mongoosePaginate);

export interface Thumbnail extends mongoose.Document {
    uploaded: Date,
    thumbnail: { data: Buffer, contentType: String }
}

export interface Photograph extends mongoose.Document {
    name: String,
    title: String,
    hash: String,
    uploaded: Date,
    thumbnail: { data: Buffer, contentType: String },
    tags: String[]
}

export interface Metadata extends mongoose.Document {
    name: String,
    title: String,
    hash: String,
    uploaded: Date,
    tags: String[]
}

photoSchema.statics.findMetadataById = async function(id): Promise<Metadata> {
    const self: Model<Metadata> = this;
    return self.findById(id, {
        name: 1,
        title: 1,
        hash: 1,
        uploaded: 1,
        tags: 1
    });
}

export const Photo = <PaginateModel<Photograph>>mongoose.model<Photograph>('Photo', photoSchema);


