import {SearchParams, SearchResults} from "./types";
import {Metadata, Photo} from "../../db/schema";


export async function searchPhotos(params: SearchParams): Promise<SearchResults> {
    let query = Photo.find({
        uploaded: { $gte: params.after, $lte: params.before }
    });

    if (params.text) {
        query = query.find({
            $text: {$search: params.text}
        });
    }

    let skip = (params.page - 1) * params.pageSize;

    let results = <Metadata[]>await query.skip(skip)
        .sort({uploaded: 1})
        .select('name title hash uploaded tags')
        .limit(params.pageSize)
        .exec();

    return {
        meta: results,
        params: params
    };
}
