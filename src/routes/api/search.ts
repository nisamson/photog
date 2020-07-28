import {SearchParams, SearchResults} from "./types";
import {Metadata, Photo, Photograph} from "../../db/schema";
import {FilterQuery, PaginateResult} from "mongoose";


export async function searchPhotos(params: SearchParams): Promise<SearchResults> {
    let queryDict: FilterQuery<Photograph> = {
        uploaded: { $gte: params.after, $lte: params.before }
    };

    if (params.text) {
        queryDict = {
            ...queryDict,
            $text: {$search: params.text}
        }
    }

    let results = <PaginateResult<Metadata>>await Photo.paginate(
        queryDict,
        {
            sort: {uploaded: -1},
            select: 'name title hash uploaded tags',
            limit: params.pageSize,
            leanWithId: true,
            page: params.page,
        }
    );

    return {
        meta: results.docs,
        params: params,
        totalPages: results.totalPages
    };
}
