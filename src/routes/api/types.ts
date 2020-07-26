import {Metadata} from "../../db/schema";

export class SearchParams {
    after: Date;
    before: Date;
    text: string;
    page: number;
    pageSize: number;
    constructor(params?) {
        if (params.after) {
            this.after = new Date(params.after);
        } else {
            this.after = new Date(1980, 1);
        }

        if (params.before) {
            this.before = new Date(params.before);
        } else {
            this.before = new Date();
        }

        if (params.text) {
            this.text = params.text;
        } else {
            this.text = null;
        }

        if (params.page) {
            this.page = parseInt(params.page);
            if (isNaN(this.page)) {
                this.page = 1;
            }
        } else {
            this.page = 1;
        }

        if (params.pageSize) {
            this.pageSize = parseInt(params.pageSize);
            if (isNaN(this.pageSize)) {
                this.pageSize = 8;
            }
        } else {
            this.pageSize = 8;
        }
    }

    nextPage(): SearchParams {
        let clone: SearchParams = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.page += 1;
        return clone;
    }

    prevPage(): SearchParams | null {
        if (this.page === 1) {
            return null;
        } else {
            let clone: SearchParams = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
            clone.page -= 1;
            return clone;
        }
    }

    toURLEncoded(): string {
        const res = new URLSearchParams();
        res.append('page', this.page.toString());
        res.append('pageSize', this.pageSize.toString());
        res.append('before', this.before.toUTCString());
        res.append('after', this.after.toUTCString());
        if (this.text) {
            res.append('text', this.text);
        }

        return res.toString();
    }
}

export interface SearchResults {
    meta: Metadata[],
    params: SearchParams
}


